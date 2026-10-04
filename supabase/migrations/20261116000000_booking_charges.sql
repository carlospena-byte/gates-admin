-- gates-admin: amenity bookings that cost money become installments.
--
-- An amenity with requires_payment + price bills the unit once per booking.
-- Rather than a parallel payments system, the booking is stored as a
-- charge_installments row with no recurring charge behind it (charge_id is
-- null, booking_id set), so payments, balances, overdue flags, the Cobranza
-- screens/KPIs and the resident app all work unchanged.
--
--   booking confirmed  -> installment created (due on the booking date,
--                         no late fee). Re-confirming reopens a cancelled one.
--   booking cancelled / expired -> installment cancelled, unless it already
--                         has payments (then the admin decides what to do).
--
-- The unit is amenity_bookings.unit_id, or the user's only unit in that
-- residential when the booking has none. Without a resolvable unit nothing
-- can be billed and no installment is created.
-- Existing bookings are not backfilled.

alter table public.charge_installments
  alter column charge_id drop not null,
  add column if not exists booking_id uuid references public.amenity_bookings(id) on delete set null,
  -- Display name for installments without a charge (the amenity's name).
  add column if not exists description text;

alter table public.charge_installments drop constraint if exists charge_installments_origin_check;
alter table public.charge_installments
  add constraint charge_installments_origin_check
  check (charge_id is not null or description is not null);

create unique index if not exists charge_installments_booking_uniq
  on public.charge_installments (booking_id);

-- ----------------------------------------------------------------------------
-- Read model: charge_name falls back to the description; `source` tells the
-- UIs where the installment came from ('charge' | 'booking').
-- ----------------------------------------------------------------------------

drop view if exists public.v_charge_installments;

create view public.v_charge_installments
with (security_invoker = true)
as
select
  i.*,
  coalesce(c.name, i.description, '') as charge_name,
  case when i.charge_id is null then 'booking' else 'charge' end as source,
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
left join public.charges c on c.id = i.charge_id
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

grant select on public.v_charge_installments to authenticated;

-- ----------------------------------------------------------------------------
-- Booking -> installment
-- ----------------------------------------------------------------------------

create or replace function public.sync_booking_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity record;
  v_unit uuid;
  v_id uuid;
begin
  if new.status = 'confirmed' then
    select a.name, a.requires_payment, a.price into v_amenity
    from public.amenities a where a.id = new.amenity_id;

    if not found or not coalesce(v_amenity.requires_payment, false)
       or coalesce(v_amenity.price, 0) <= 0 then
      return null;
    end if;

    v_unit := new.unit_id;
    if v_unit is null then
      select (array_agg(um.unit_id))[1] into v_unit
      from public.unit_members um
      where um.user_id = new.user_id and um.residential_id = new.residential_id
      having count(*) = 1;
    end if;
    if v_unit is null then
      return null;
    end if;

    insert into public.charge_installments (
      residential_id, unit_id, booking_id, description, period, base_amount, due_date
    )
    values (
      new.residential_id, v_unit, new.id, v_amenity.name,
      date_trunc('month', new.start_time)::date, v_amenity.price,
      (new.start_time at time zone 'UTC')::date
    )
    on conflict (booking_id) do nothing
    returning id into v_id;

    if v_id is null then
      -- Already billed: re-confirming a cancelled booking reopens its charge.
      update public.charge_installments
      set status = 'pending'
      where booking_id = new.id and status = 'cancelled'
      returning id into v_id;
      if v_id is not null then
        perform public.recompute_installment(v_id);
      end if;
    end if;

  elsif new.status in ('cancelled', 'expired') then
    update public.charge_installments
    set status = 'cancelled'
    where booking_id = new.id
      and status in ('pending', 'partial')
      and paid_amount = 0;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_booking_installment() from public, anon, authenticated;

drop trigger if exists amenity_bookings_installment on public.amenity_bookings;
create trigger amenity_bookings_installment
after insert or update of status on public.amenity_bookings
for each row execute function public.sync_booking_installment();
