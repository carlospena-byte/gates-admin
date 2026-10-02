-- gates-admin: recurring monthly billing (cobros recurrentes)
--
-- Model:
--   charges              the rule/template ("Seguridad", "Piscina") — amount,
--                        due day, late-fee policy. One charge per distinct
--                        price/audience; they are NOT shared across groups.
--   charge_assignments   which units a charge applies to: a location and all
--                        its descendants, one location only, or one exact unit.
--                        Resolved to concrete units at generation time, so
--                        new units under a covered location are picked up.
--   charge_installments  one row per charge + unit + month, generated on the
--                        charge's generation day. Amount and due date are
--                        frozen at generation.
--   charge_payments      manual payments (abonos) recorded by the admin
--                        against an installment; partial payments allowed.
--   residential_billing_settings  per-residential policy (late fee applied
--                        once vs. repeated every overdue month).
--
-- "Overdue" is never stored: it is a pending/partial installment whose
-- due_date has passed (see v_charge_installments).
-- Replaces unit_charges (per-unit price) — data is migrated below.

-- ----------------------------------------------------------------------------
-- charges: billing fields
-- ----------------------------------------------------------------------------

alter table public.charges
  add column if not exists amount numeric(12,2) not null default 0,
  add column if not exists generation_day integer not null default 1,
  add column if not exists due_day integer not null default 10,
  add column if not exists late_fee_type text not null default 'none',
  add column if not exists late_fee_value numeric(12,2) not null default 0,
  add column if not exists starts_on date not null default current_date,
  add column if not exists ends_on date;

-- Days are capped at 28 so every month has them.
alter table public.charges drop constraint if exists charges_billing_check;
alter table public.charges
  add constraint charges_billing_check check (
    amount >= 0
    and generation_day between 1 and 28
    and due_day between 1 and 28
    and late_fee_type in ('none', 'fixed', 'percent')
    and late_fee_value >= 0
    and (late_fee_type <> 'percent' or late_fee_value <= 100)
    and (ends_on is null or ends_on >= starts_on)
  );

-- ----------------------------------------------------------------------------
-- Per-residential billing policy
-- ----------------------------------------------------------------------------

create table if not exists public.residential_billing_settings (
  residential_id uuid primary key references public.residentials(id) on delete cascade,
  -- 'once': the late fee is applied a single time after the due date.
  -- 'monthly': it is applied again for every month the installment stays unpaid.
  late_fee_recurrence text not null default 'once',
  updated_at timestamptz not null default now(),
  constraint residential_billing_settings_recurrence_check
    check (late_fee_recurrence in ('once', 'monthly'))
);

-- ----------------------------------------------------------------------------
-- Assignments
-- ----------------------------------------------------------------------------

create table if not exists public.charge_assignments (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  scope text not null,
  location_id uuid references public.locations(id) on delete cascade,
  unit_id uuid references public.units(id) on delete cascade,
  -- Null = use charges.amount.
  amount_override numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint charge_assignments_scope_check check (
    (scope in ('location_subtree', 'location_only') and location_id is not null and unit_id is null)
    or (scope = 'unit' and unit_id is not null and location_id is null)
  ),
  constraint charge_assignments_override_check check (amount_override is null or amount_override >= 0)
);

create unique index if not exists charge_assignments_location_uniq
  on public.charge_assignments (charge_id, scope, location_id) where location_id is not null;
create unique index if not exists charge_assignments_unit_uniq
  on public.charge_assignments (charge_id, unit_id) where unit_id is not null;
create index if not exists idx_charge_assignments_residential_id on public.charge_assignments(residential_id);
create index if not exists idx_charge_assignments_charge_id on public.charge_assignments(charge_id);

-- ----------------------------------------------------------------------------
-- Installments + payments
-- ----------------------------------------------------------------------------

create table if not exists public.charge_installments (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  -- First day of the billed month.
  period date not null,
  base_amount numeric(12,2) not null,
  due_date date not null,
  -- Late-fee policy frozen at generation, like the amount.
  late_fee_type text not null default 'none',
  late_fee_value numeric(12,2) not null default 0,
  status text not null default 'pending',
  -- Maintained by trigger from charge_payments.
  paid_amount numeric(12,2) not null default 0,
  -- Date the installment was fully settled; null while pending/partial.
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (charge_id, unit_id, period),
  constraint charge_installments_status_check check (status in ('pending', 'partial', 'paid', 'cancelled')),
  constraint charge_installments_period_check check (period = date_trunc('month', period)::date)
);

create index if not exists idx_charge_installments_residential_period
  on public.charge_installments (residential_id, period);
create index if not exists idx_charge_installments_unit_id on public.charge_installments(unit_id);
create index if not exists idx_charge_installments_open
  on public.charge_installments (residential_id, due_date) where status in ('pending', 'partial');

create table if not exists public.charge_payments (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  installment_id uuid not null references public.charge_installments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text,
  reference text,
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_charge_payments_installment_id on public.charge_payments(installment_id);
create index if not exists idx_charge_payments_residential_id on public.charge_payments(residential_id);

-- ----------------------------------------------------------------------------
-- Late-fee math
-- ----------------------------------------------------------------------------

-- Fee owed on an installment as of `_as_of`. Nothing is owed up to and
-- including the due date. 'once' charges the fee a single time; 'monthly'
-- charges it for the first overdue month plus one more per whole month elapsed.
create or replace function public.charge_late_fee(
  _base numeric,
  _fee_type text,
  _fee_value numeric,
  _recurrence text,
  _due_date date,
  _as_of date
)
returns numeric
language sql
immutable
as $$
  select case
    when _fee_type = 'none' or _as_of <= _due_date then 0
    else round(
      (case when _fee_type = 'percent' then _base * _fee_value / 100 else _fee_value end)
      * (case
           when _recurrence = 'monthly'
           then 1 + (extract(year from age(_as_of, _due_date)) * 12 + extract(month from age(_as_of, _due_date)))
           else 1
         end),
      2
    )
  end;
$$;

-- ----------------------------------------------------------------------------
-- Payments keep the installment's paid_amount / status / paid_at in sync
-- ----------------------------------------------------------------------------

create or replace function public.sync_installment_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := coalesce(new.installment_id, old.installment_id);
  v_inst public.charge_installments%rowtype;
  v_recurrence text;
  v_paid numeric(12,2);
  v_last date;
  v_fee numeric;
begin
  select * into v_inst from public.charge_installments where id = v_id;
  if not found or v_inst.status = 'cancelled' then
    return null;
  end if;

  select coalesce(sum(amount), 0), max(paid_on)
    into v_paid, v_last
  from public.charge_payments where installment_id = v_id;

  select coalesce(
           (select s.late_fee_recurrence from public.residential_billing_settings s
             where s.residential_id = v_inst.residential_id),
           'once')
    into v_recurrence;

  -- Settled-ness is judged as of the date of the last payment, so paying on
  -- time stays "paid" even though the fee would grow if evaluated today.
  v_fee := public.charge_late_fee(
    v_inst.base_amount, v_inst.late_fee_type, v_inst.late_fee_value,
    v_recurrence, v_inst.due_date, coalesce(v_last, current_date)
  );

  update public.charge_installments
  set paid_amount = v_paid,
      status = case
        when v_paid <= 0 then 'pending'
        when v_paid >= v_inst.base_amount + v_fee then 'paid'
        else 'partial'
      end,
      paid_at = case when v_paid > 0 and v_paid >= v_inst.base_amount + v_fee then v_last end
  where id = v_id;

  return null;
end;
$$;

drop trigger if exists charge_payments_sync on public.charge_payments;
create trigger charge_payments_sync
after insert or update or delete on public.charge_payments
for each row execute function public.sync_installment_payments();

-- ----------------------------------------------------------------------------
-- Installments with computed late fee / balance / overdue (read model)
-- ----------------------------------------------------------------------------

create or replace view public.v_charge_installments
with (security_invoker = true)
as
select
  i.*,
  c.name as charge_name,
  u.name as unit_name,
  u.location_id as unit_location_id,
  f.late_fee,
  i.base_amount + f.late_fee as total_due,
  greatest(i.base_amount + f.late_fee - i.paid_amount, 0) as balance,
  (i.status in ('pending', 'partial') and i.due_date < current_date) as is_overdue,
  case
    when i.status in ('pending', 'partial') and i.due_date < current_date
    then current_date - i.due_date
    else 0
  end as days_overdue
from public.charge_installments i
join public.charges c on c.id = i.charge_id
join public.units u on u.id = i.unit_id
left join public.residential_billing_settings s on s.residential_id = i.residential_id
cross join lateral (
  select case
    when i.status = 'cancelled' then 0
    else public.charge_late_fee(
      i.base_amount, i.late_fee_type, i.late_fee_value,
      coalesce(s.late_fee_recurrence, 'once'), i.due_date,
      coalesce(i.paid_at, current_date)
    )
  end as late_fee
) f;

-- ----------------------------------------------------------------------------
-- Resolving a charge's rules into concrete units
-- ----------------------------------------------------------------------------

-- One row per active unit the charge covers, with the amount it pays. When a
-- unit matches several rules the most specific one wins (exact unit > exact
-- location > nearest ancestor subtree), so nobody is billed twice.
create or replace function public.resolve_charge_units(_charge_id uuid)
returns table (unit_id uuid, amount numeric, assignment_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive
  ch as (select id, residential_id, amount from public.charges where id = _charge_id),
  a as (
    select ca.* from public.charge_assignments ca
    where ca.charge_id = _charge_id and ca.is_active
  ),
  tree as (
    select a.id as assignment_id, a.location_id as loc_id, 0 as depth
    from a where a.scope in ('location_subtree', 'location_only')
    union all
    select t.assignment_id, l.id, t.depth + 1
    from tree t
    join a on a.id = t.assignment_id and a.scope = 'location_subtree'
    join public.locations l on l.parent_id = t.loc_id
  ),
  cand as (
    select u.id as unit_id, a.id as assignment_id, a.amount_override, 1 as rnk, 0 as depth, a.created_at
    from a join public.units u on u.id = a.unit_id
    where a.scope = 'unit'
    union all
    select u.id, a.id, a.amount_override,
           case when a.scope = 'location_only' then 2 else 3 end, t.depth, a.created_at
    from tree t
    join a on a.id = t.assignment_id
    join public.units u on u.location_id = t.loc_id
    where a.scope = 'location_subtree' or t.depth = 0
  )
  select distinct on (cand.unit_id)
    cand.unit_id,
    coalesce(cand.amount_override, ch.amount),
    cand.assignment_id
  from cand
  join ch on true
  join public.units u on u.id = cand.unit_id
  where u.is_active and u.residential_id = ch.residential_id
  order by cand.unit_id, cand.rnk, cand.depth, cand.created_at;
$$;

-- Admin-facing: how many units each charge currently covers (for lists/previews).
create or replace function public.charge_unit_counts(_residential_id uuid)
returns table (charge_id uuid, unit_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, (select count(*) from public.resolve_charge_units(c.id))
  from public.charges c
  where c.residential_id = _residential_id
    and (public.is_platform_admin() or public.is_residential_member(_residential_id));
$$;

-- Charges that apply to one unit, with the amount it pays (unit detail panel).
create or replace function public.unit_applicable_charges(_unit_id uuid)
returns table (charge_id uuid, charge_name text, amount numeric, is_active boolean)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, r.amount, c.is_active
  from public.units un
  join public.charges c on c.residential_id = un.residential_id
  cross join lateral public.resolve_charge_units(c.id) r
  where un.id = _unit_id
    and r.unit_id = _unit_id
    and (public.is_platform_admin() or public.is_residential_member(un.residential_id));
$$;

-- ----------------------------------------------------------------------------
-- Generation
-- ----------------------------------------------------------------------------

-- Shared worker. Idempotent: the unique key makes re-runs no-ops, and rows
-- already generated keep their frozen amount even if the charge changed.
create or replace function public._generate_installments(
  _period date,
  _residential_id uuid,
  _charge_id uuid,
  _only_due_today boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', _period)::date;
  v_count integer := 0;
  v_added integer;
  c record;
begin
  for c in
    select * from public.charges ch
    where ch.is_active
      and (_residential_id is null or ch.residential_id = _residential_id)
      and (_charge_id is null or ch.id = _charge_id)
      and (not _only_due_today or ch.generation_day = extract(day from current_date)::int)
      and v_period >= date_trunc('month', ch.starts_on)::date
      and (ch.ends_on is null or v_period <= ch.ends_on)
  loop
    insert into public.charge_installments (
      residential_id, charge_id, unit_id, period, base_amount, due_date,
      late_fee_type, late_fee_value
    )
    select c.residential_id, c.id, r.unit_id, v_period, r.amount,
           v_period + (c.due_day - 1),
           c.late_fee_type, c.late_fee_value
    from public.resolve_charge_units(c.id) r
    on conflict (charge_id, unit_id, period) do nothing;

    get diagnostics v_added = row_count;
    v_count := v_count + v_added;
  end loop;

  return v_count;
end;
$$;

-- Admin button: "Generate / regenerate period". Returns installments created.
create or replace function public.generate_charge_installments(
  _residential_id uuid,
  _period date default current_date,
  _charge_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_platform_admin() or public.is_residential_admin(_residential_id)) then
    raise exception 'not authorized';
  end if;
  return public._generate_installments(_period, _residential_id, _charge_id, false);
end;
$$;

-- Daily cron entry point: only charges whose generation_day is today.
create or replace function public.run_scheduled_charge_generation()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._generate_installments(current_date, null, null, true);
end;
$$;

revoke all on function public._generate_installments(date, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.run_scheduled_charge_generation() from public, anon, authenticated;
grant execute on function public.resolve_charge_units(uuid) to authenticated;
grant execute on function public.charge_unit_counts(uuid) to authenticated;
grant execute on function public.unit_applicable_charges(uuid) to authenticated;
grant execute on function public.generate_charge_installments(uuid, date, uuid) to authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'generate-recurring-charges',
  '10 0 * * *',
  $$select public.run_scheduled_charge_generation();$$
);

-- ----------------------------------------------------------------------------
-- Migrate unit_charges -> charge_assignments, then drop it
-- ----------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.unit_charges') is not null then
    insert into public.charge_assignments (residential_id, charge_id, scope, unit_id, amount_override, is_active)
    select residential_id, charge_id, 'unit', unit_id, price, is_active
    from public.unit_charges
    on conflict do nothing;

    drop table public.unit_charges;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- updated_at, audit, RLS, grants
-- ----------------------------------------------------------------------------

drop trigger if exists update_charge_assignments_updated_at on public.charge_assignments;
create trigger update_charge_assignments_updated_at before update on public.charge_assignments
for each row execute function public.update_updated_at_column();

drop trigger if exists update_charge_installments_updated_at on public.charge_installments;
create trigger update_charge_installments_updated_at before update on public.charge_installments
for each row execute function public.update_updated_at_column();

drop trigger if exists update_residential_billing_settings_updated_at on public.residential_billing_settings;
create trigger update_residential_billing_settings_updated_at before update on public.residential_billing_settings
for each row execute function public.update_updated_at_column();

drop trigger if exists audit_charge_assignments on public.charge_assignments;
create trigger audit_charge_assignments after insert or update or delete on public.charge_assignments
for each row execute function public.log_audit_event();

drop trigger if exists audit_charge_installments on public.charge_installments;
create trigger audit_charge_installments after insert or update or delete on public.charge_installments
for each row execute function public.log_audit_event();

drop trigger if exists audit_charge_payments on public.charge_payments;
create trigger audit_charge_payments after insert or update or delete on public.charge_payments
for each row execute function public.log_audit_event();

alter table public.residential_billing_settings enable row level security;
alter table public.charge_assignments enable row level security;
alter table public.charge_installments enable row level security;
alter table public.charge_payments enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'residential_billing_settings', 'charge_assignments', 'charge_installments', 'charge_payments'
  ] loop
    execute format('drop policy if exists "%1$s: platform admin all" on public.%1$s', t);
    execute format($p$create policy "%1$s: platform admin all" on public.%1$s for all to authenticated
      using (is_platform_admin()) with check (is_platform_admin())$p$, t);

    execute format('drop policy if exists "%1$s: owner admin manage" on public.%1$s', t);
    execute format($p$create policy "%1$s: owner admin manage" on public.%1$s for all to authenticated
      using (is_residential_admin(residential_id)) with check (is_residential_admin(residential_id))$p$, t);

    -- Residents must not see other units' balances: admin-only tables. Only
    -- the rules (assignments) are readable by members, like charges.
    execute format('drop policy if exists "%1$s: members view" on public.%1$s', t);
    if t = 'charge_assignments' then
      execute format($p$create policy "%1$s: members view" on public.%1$s for select to authenticated
        using (is_platform_admin() or is_residential_member(residential_id))$p$, t);
    end if;
  end loop;
end $$;

grant select, insert, update, delete on public.residential_billing_settings to authenticated;
grant select, insert, update, delete on public.charge_assignments to authenticated;
grant select, insert, update, delete on public.charge_installments to authenticated;
grant select, insert, update, delete on public.charge_payments to authenticated;
grant select on public.v_charge_installments to authenticated;
