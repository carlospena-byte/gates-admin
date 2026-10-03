-- gates-admin: alert admins when a resident cancels a booking that is already paid.
--
-- Payments are recorded manually by the admin (charge_payments), so a booking
-- installment with payments is never cancelled automatically (see
-- sync_booking_installment): someone has to void the payment / refund it.
-- Until now nobody was told. When the RESIDENT cancels (auth.uid() = the
-- booking's user), this now:
--   1. pushes the residential's admins, with who/what/when and every payment
--      (amount, method, reference, date) so they can find and void it;
--   2. leaves the same summary in the installment's `notes`, which the
--      Cobranza payment dialog shows as a warning;
--   3. once the admin voids the last payment, cancels the installment so the
--      unit is not left owing for a booking that no longer exists.

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
  v_inst record;
  v_resident text;
  v_unit_name text;
  v_when text;
  v_payments text;
  v_summary text;
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

    -- Resident-initiated cancellation of a booking that already has payments.
    if new.status = 'cancelled'
       and tg_op = 'UPDATE'
       and old.status is distinct from 'cancelled'
       and auth.uid() is not null
       and auth.uid() = new.user_id then
      select i.id, i.unit_id, i.paid_amount, i.description into v_inst
      from public.charge_installments i
      where i.booking_id = new.id and i.status <> 'cancelled' and i.paid_amount > 0;

      if found then
        select coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.email, 'Residente')
          into v_resident
        from public.profiles p where p.user_id = new.user_id;
        select u.name into v_unit_name from public.units u where u.id = v_inst.unit_id;

        -- Booking time in the resident's local day (see amenity_blackout_local_tz).
        v_when := to_char(
          (new.start_time at time zone 'utc') + new.tz_offset_minutes * interval '1 minute',
          'DD/MM/YYYY HH24:MI'
        );

        select string_agg(
          '$' || to_char(cp.amount, 'FM999G999G990D00')
            || ' (' || case cp.method
                 when 'cash' then 'efectivo' when 'transfer' then 'transferencia'
                 when 'check' then 'cheque' else coalesce(cp.method, 'otro') end
            || coalesce(', ref. ' || nullif(cp.reference, ''), '')
            || ', ' || to_char(cp.paid_on, 'DD/MM/YYYY') || ')',
          '; ' order by cp.paid_on, cp.created_at
        ) into v_payments
        from public.charge_payments cp where cp.installment_id = v_inst.id;

        v_summary := format(
          '%s (%s) canceló su reserva de %s del %s. Pagado: %s. Anula el pago en Cobranza si procede el reembolso.',
          v_resident, coalesce(v_unit_name, 'sin unidad'), v_inst.description, v_when, v_payments
        );

        update public.charge_installments
        set notes = concat_ws(E'\n', nullif(notes, ''), '[Reserva cancelada] ' || v_summary)
        where id = v_inst.id;

        insert into public.push_notifications (
          residential_id, title, body, destination, audience, status, scheduled_at
        )
        values (
          new.residential_id,
          'Reserva cancelada con pago',
          left(v_summary, 500),
          'billing', 'admins', 'scheduled', now()
        );
      end if;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_booking_installment() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- Voiding the last payment of a cancelled booking closes its installment.
-- Named so it fires after the trigger that re-syncs paid_amount/status.
-- ----------------------------------------------------------------------------

create or replace function public.close_cancelled_booking_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.charge_installments i
  set status = 'cancelled'
  where i.id = old.installment_id
    and i.booking_id is not null
    and i.status in ('pending', 'partial')
    and i.paid_amount = 0
    and exists (
      select 1 from public.amenity_bookings b
      where b.id = i.booking_id and b.status in ('cancelled', 'expired')
    );
  return null;
end;
$$;

revoke all on function public.close_cancelled_booking_installment() from public, anon, authenticated;

drop trigger if exists zz_charge_payments_close_cancelled_booking on public.charge_payments;
create trigger zz_charge_payments_close_cancelled_booking
after delete on public.charge_payments
for each row execute function public.close_cancelled_booking_installment();
