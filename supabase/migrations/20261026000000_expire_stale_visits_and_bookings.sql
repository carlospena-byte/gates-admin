-- Visits reported by a resident (status 'pending_registration'/'scheduled')
-- and amenity bookings awaiting review (status 'pending') that nobody
-- approved or rejected before their date passed used to stay stuck in that
-- pending state forever — they'd keep showing up as "upcoming" instead of
-- falling into the history/historial views. Adds an 'expired' status and a
-- nightly pg_cron job that flips them over once their window has closed.

alter table public.visitors drop constraint if exists visitors_status_check;
alter table public.visitors
  add constraint visitors_status_check
  check (status in ('pending_registration', 'scheduled', 'active', 'inside', 'completed', 'cancelled', 'rejected', 'expired'));

alter table public.amenity_bookings drop constraint if exists amenity_bookings_status_check;
alter table public.amenity_bookings
  add constraint amenity_bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'expired'));

create or replace function public.expire_stale_visits_and_bookings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.visitors
  set status = 'expired'
  where status in ('pending_registration', 'scheduled')
    and valid_until < now();

  update public.amenity_bookings
  set status = 'expired'
  where status = 'pending'
    and end_time < now();
end;
$$;

alter function public.expire_stale_visits_and_bookings() owner to postgres;

create extension if not exists pg_cron;

select cron.schedule(
  'expire-stale-visits-and-bookings',
  '5 0 * * *',
  $$select public.expire_stale_visits_and_bookings();$$
);
