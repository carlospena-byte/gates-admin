-- gates-admin: billing reports + installment cancel/reopen
--
-- Server-side aggregates for the Cobranza screen (KPIs, delinquency list) so
-- they aren't capped by PostgREST's row limit, plus a cancel/reopen RPC.
-- All of them are admin-only: they expose every unit's balance.

-- ----------------------------------------------------------------------------
-- Recompute an installment from its payments (extracted from the trigger so
-- reopening a cancelled installment can reuse it)
-- ----------------------------------------------------------------------------

create or replace function public.recompute_installment(_installment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst public.charge_installments%rowtype;
  v_recurrence text;
  v_paid numeric(12,2);
  v_last date;
  v_fee numeric;
begin
  select * into v_inst from public.charge_installments where id = _installment_id;
  if not found or v_inst.status = 'cancelled' then
    return;
  end if;

  select coalesce(sum(amount), 0), max(paid_on)
    into v_paid, v_last
  from public.charge_payments where installment_id = _installment_id;

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
  where id = _installment_id;
end;
$$;

revoke all on function public.recompute_installment(uuid) from public, anon, authenticated;

create or replace function public.sync_installment_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_installment(coalesce(new.installment_id, old.installment_id));
  return null;
end;
$$;

-- Cancel an installment (e.g. billed by mistake) or reopen it. Reopening
-- rebuilds its status from whatever payments it already has.
create or replace function public.set_installment_cancelled(_installment_id uuid, _cancelled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_residential uuid;
begin
  select residential_id into v_residential from public.charge_installments where id = _installment_id;
  if v_residential is null then
    raise exception 'installment not found';
  end if;
  if not (public.is_platform_admin() or public.is_residential_admin(v_residential)) then
    raise exception 'not authorized';
  end if;

  if _cancelled then
    update public.charge_installments set status = 'cancelled' where id = _installment_id;
  else
    update public.charge_installments set status = 'pending' where id = _installment_id and status = 'cancelled';
    perform public.recompute_installment(_installment_id);
  end if;
end;
$$;

grant execute on function public.set_installment_cancelled(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- KPIs for one month + a 6-month trend
-- ----------------------------------------------------------------------------

create or replace function public.billing_summary(_residential_id uuid, _period date default current_date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', _period)::date;
  v_result jsonb;
begin
  if not (public.is_platform_admin() or public.is_residential_admin(_residential_id)) then
    raise exception 'not authorized';
  end if;

  with cur as (
    select * from public.v_charge_installments
    where residential_id = _residential_id and period = v_period and status <> 'cancelled'
  ),
  overdue as (
    select * from public.v_charge_installments
    where residential_id = _residential_id and is_overdue
  ),
  per_unit as (
    select unit_id, count(*) as n from overdue group by unit_id
  ),
  trend as (
    select p.period,
           coalesce(sum(i.total_due), 0) as billed,
           coalesce(sum(i.paid_amount), 0) as collected
    from generate_series(v_period - interval '5 months', v_period, interval '1 month') as p(period)
    left join public.v_charge_installments i
      on i.residential_id = _residential_id and i.period = p.period::date and i.status <> 'cancelled'
    group by p.period
    order by p.period
  )
  select jsonb_build_object(
    'period', v_period,
    'installments', (select count(*) from cur),
    'billed', (select coalesce(sum(total_due), 0) from cur),
    'collected', (select coalesce(sum(paid_amount), 0) from cur),
    'paid_count', (select count(*) from cur where status = 'paid'),
    'pending_current', (select coalesce(sum(balance), 0) from cur where not is_overdue and status <> 'paid'),
    'overdue_balance', (select coalesce(sum(balance), 0) from overdue),
    'overdue_late_fees', (select coalesce(sum(late_fee), 0) from overdue),
    'overdue_installments', (select count(*) from overdue),
    'overdue_units', (select count(*) from per_unit),
    'units_multiple', (select count(*) from per_unit where n >= 2),
    'trend', (select coalesce(jsonb_agg(jsonb_build_object(
        'period', period::date, 'billed', billed, 'collected', collected) order by period), '[]'::jsonb) from trend)
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.billing_summary(uuid, date) to authenticated;

-- ----------------------------------------------------------------------------
-- Delinquent units: one row per unit with at least one overdue installment
-- ----------------------------------------------------------------------------

create or replace function public.billing_delinquent_units(_residential_id uuid)
returns table (
  unit_id uuid,
  unit_name text,
  unit_location_id uuid,
  overdue_count bigint,
  overdue_balance numeric,
  late_fees numeric,
  oldest_due_date date,
  max_days_overdue integer,
  charge_names text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.is_platform_admin() or public.is_residential_admin(_residential_id)) then
    raise exception 'not authorized';
  end if;

  return query
  select
    v.unit_id,
    v.unit_name,
    v.unit_location_id,
    count(*),
    sum(v.balance),
    sum(v.late_fee),
    min(v.due_date),
    max(v.days_overdue)::integer,
    array_agg(distinct v.charge_name)
  from public.v_charge_installments v
  where v.residential_id = _residential_id and v.is_overdue
  group by v.unit_id, v.unit_name, v.unit_location_id
  order by sum(v.balance) desc;
end;
$$;

grant execute on function public.billing_delinquent_units(uuid) to authenticated;
