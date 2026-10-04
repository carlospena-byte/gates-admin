-- gates-admin: user_notifications
-- Per-user notification inbox behind the bell in the mobile app. One row per
-- recipient. Two sources feed it:
--  * the push edge functions (visitor check-in, payment verified, bulletin,
--    comunicado) record a row for every recipient alongside the FCM send, with
--    `type` + `data` equal to the push payload so a tap routes identically;
--  * the triggers below, for events that have no push: a booking confirmed or
--    cancelled by an admin, an incident changing status, a new charge.
-- Rows older than 90 days are purged daily.

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  residential_id uuid references public.residentials(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  -- Same shape as the FCM `data` payload (type, bulletin_id, route, ...).
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_created
  on public.user_notifications (user_id, created_at desc);
create index if not exists idx_user_notifications_unread
  on public.user_notifications (user_id) where read_at is null;
create index if not exists idx_user_notifications_created
  on public.user_notifications (created_at);

alter table public.user_notifications enable row level security;

drop policy if exists "user_notifications: own read" on public.user_notifications;
create policy "user_notifications: own read"
  on public.user_notifications for select
  to authenticated
  using (user_id = auth.uid());

-- Residents may only flip read_at (enforced by the column grant below).
drop policy if exists "user_notifications: own mark read" on public.user_notifications;
create policy "user_notifications: own mark read"
  on public.user_notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.user_notifications from authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;
grant select, insert, update, delete on public.user_notifications to service_role;

-- Live updates for the unread badge and the open inbox.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_notifications'
  ) then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Retention: 90 days
-- ----------------------------------------------------------------------------

create or replace function public.purge_old_user_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.user_notifications where created_at < now() - interval '90 days';
$$;

alter function public.purge_old_user_notifications() owner to postgres;
revoke all on function public.purge_old_user_notifications() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule(
  'purge-old-user-notifications',
  '30 3 * * *',
  $$select public.purge_old_user_notifications();$$
);

-- ----------------------------------------------------------------------------
-- Events without a push
-- ----------------------------------------------------------------------------

-- Booking confirmed / cancelled by someone other than the resident.
create or replace function public.notify_booking_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amenity text;
begin
  if new.status is not distinct from old.status
     or new.status not in ('confirmed', 'cancelled')
     or auth.uid() is not distinct from new.user_id then
    return new;
  end if;

  select name into v_amenity from public.amenities where id = new.amenity_id;

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  values (
    new.user_id,
    new.residential_id,
    'booking',
    case new.status when 'confirmed' then 'Reserva confirmada' else 'Reserva cancelada' end,
    case new.status
      when 'confirmed' then format('Tu reserva de %s fue confirmada.', coalesce(v_amenity, 'la amenidad'))
      else format('Tu reserva de %s fue cancelada.', coalesce(v_amenity, 'la amenidad'))
    end,
    jsonb_build_object('type', 'booking', 'booking_id', new.id, 'residential_id', new.residential_id)
  );
  return new;
end;
$$;

alter function public.notify_booking_status() owner to postgres;

drop trigger if exists notify_booking_status on public.amenity_bookings;
create trigger notify_booking_status after update of status on public.amenity_bookings
for each row execute function public.notify_booking_status();

-- Incident moved forward by an admin: tell whoever reported it.
create or replace function public.notify_incident_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is not distinct from old.status
     or new.status = 'new'
     or new.reported_by is null
     or auth.uid() is not distinct from new.reported_by then
    return new;
  end if;

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  values (
    new.reported_by,
    new.residential_id,
    'incident',
    'Actualización de tu reporte',
    format(
      '"%s" ahora está %s.',
      new.title,
      case new.status
        when 'in_progress' then 'en proceso'
        when 'resolved' then 'resuelto'
        else 'cerrado'
      end
    ),
    jsonb_build_object('type', 'incident', 'incident_id', new.id, 'residential_id', new.residential_id)
  );
  return new;
end;
$$;

alter function public.notify_incident_status() owner to postgres;

drop trigger if exists notify_incident_status on public.incidents;
create trigger notify_incident_status after update of status on public.incidents
for each row execute function public.notify_incident_status();

-- New charge for a unit. Only open, not-yet-due installments: bulk imports of
-- historical (paid / past due) installments must not flood residents.
create or replace function public.notify_new_installment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge text;
begin
  if new.status <> 'pending' or new.paid_amount > 0 or new.due_date < current_date then
    return new;
  end if;

  select name into v_charge from public.charges where id = new.charge_id;

  insert into public.user_notifications (user_id, residential_id, type, title, body, data)
  select
    m.user_id,
    new.residential_id,
    'charge',
    'Nuevo cobro',
    format(
      '%s: $%s, vence el %s.',
      coalesce(v_charge, 'Cobro'),
      to_char(new.base_amount, 'FM999,999,990.00'),
      to_char(new.due_date, 'DD/MM/YYYY')
    ),
    jsonb_build_object('type', 'charge', 'unit_id', new.unit_id, 'residential_id', new.residential_id)
  from public.unit_members m
  where m.unit_id = new.unit_id;
  return new;
end;
$$;

alter function public.notify_new_installment() owner to postgres;

drop trigger if exists notify_new_installment on public.charge_installments;
create trigger notify_new_installment after insert on public.charge_installments
for each row execute function public.notify_new_installment();
