-- gates-admin: admin_alerts — persistent alerts for a residential's admins.
--
-- Feeds the bell in the admin panel. Unlike a push (fire and forget, and only
-- reaches admins who use the mobile app), an alert stays until it is resolved.
-- First kind: 'booking_cancelled_paid' — a resident cancelled a booking that
-- already has payments, so an admin has to void/refund them in Cobranza.
-- It resolves itself once the installment is cancelled (last payment voided),
-- or an admin can dismiss it.

create table if not exists public.admin_alerts (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  -- Structured data so the UI can lay it out (resident, unit, amenity,
  -- booking_start, paid_total, payments[]).
  details jsonb not null default '{}'::jsonb,
  booking_id uuid references public.amenity_bookings(id) on delete cascade,
  installment_id uuid references public.charge_installments(id) on delete cascade,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_alerts_open
  on public.admin_alerts (residential_id, created_at desc) where resolved_at is null;
create index if not exists idx_admin_alerts_installment on public.admin_alerts (installment_id);

alter table public.admin_alerts enable row level security;

drop policy if exists "admin_alerts: platform admin all" on public.admin_alerts;
create policy "admin_alerts: platform admin all"
  on public.admin_alerts for all to authenticated
  using (is_platform_admin()) with check (is_platform_admin());

-- Admins read and resolve; rows are only ever created by the trigger below.
drop policy if exists "admin_alerts: owner admin select" on public.admin_alerts;
create policy "admin_alerts: owner admin select"
  on public.admin_alerts for select to authenticated
  using (is_residential_admin(residential_id));

drop policy if exists "admin_alerts: owner admin update" on public.admin_alerts;
create policy "admin_alerts: owner admin update"
  on public.admin_alerts for update to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

grant select, update on public.admin_alerts to authenticated;
grant select, insert, update, delete on public.admin_alerts to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_alerts'
  ) then
    alter publication supabase_realtime add table public.admin_alerts;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Booking cancelled by the resident with payments -> alert (plus the push and
-- installment note from 20261118000001).
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
  v_inst record;
  v_resident text;
  v_unit_name text;
  v_when text;
  v_payments text;
  v_payments_json jsonb;
  v_paid_total numeric;
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
        -- It is billable again, so any open "refund this" alert is stale.
        update public.admin_alerts
        set resolved_at = now()
        where installment_id = v_id and resolved_at is null;
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

        select
          string_agg(
            '$' || to_char(cp.amount, 'FM999G999G990D00')
              || ' (' || case cp.method
                   when 'cash' then 'efectivo' when 'transfer' then 'transferencia'
                   when 'check' then 'cheque' else coalesce(cp.method, 'otro') end
              || coalesce(', ref. ' || nullif(cp.reference, ''), '')
              || ', ' || to_char(cp.paid_on, 'DD/MM/YYYY') || ')',
            '; ' order by cp.paid_on, cp.created_at
          ),
          jsonb_agg(jsonb_build_object(
            'id', cp.id, 'amount', cp.amount, 'method', cp.method,
            'reference', cp.reference, 'paid_on', cp.paid_on
          ) order by cp.paid_on, cp.created_at),
          sum(cp.amount)
        into v_payments, v_payments_json, v_paid_total
        from public.charge_payments cp where cp.installment_id = v_inst.id;

        v_summary := format(
          '%s (%s) canceló su reserva de %s del %s. Pagado: %s. Anula el pago en Cobranza si procede el reembolso.',
          v_resident, coalesce(v_unit_name, 'sin unidad'), v_inst.description, v_when, v_payments
        );

        update public.charge_installments
        set notes = concat_ws(E'\n', nullif(notes, ''), '[Reserva cancelada] ' || v_summary)
        where id = v_inst.id;

        insert into public.admin_alerts (
          residential_id, kind, title, body, details, booking_id, installment_id
        )
        values (
          new.residential_id, 'booking_cancelled_paid',
          'Reserva cancelada con pago', v_summary,
          jsonb_build_object(
            'resident', v_resident,
            'unit', v_unit_name,
            'amenity', v_inst.description,
            'booking_start', v_when,
            'paid_total', v_paid_total,
            'payments', coalesce(v_payments_json, '[]'::jsonb)
          ),
          new.id, v_inst.id
        );

        -- Also push admins who use the mobile app.
        insert into public.push_notifications (
          residential_id, title, body, destination, audience, status, scheduled_at
        )
        values (
          new.residential_id, 'Reserva cancelada con pago', left(v_summary, 500),
          'billing', 'admins', 'scheduled', now()
        );
      end if;
    end if;
  end if;

  return null;
end;
$$;

revoke all on function public.sync_booking_installment() from public, anon, authenticated;

-- Voiding the last payment closes the installment (see 20261118000001) and
-- with it the alert.
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

  if found then
    update public.admin_alerts
    set resolved_at = now()
    where installment_id = old.installment_id and resolved_at is null;
  end if;
  return null;
end;
$$;

revoke all on function public.close_cancelled_booking_installment() from public, anon, authenticated;
