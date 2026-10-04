-- gates-admin: evaluate amenity blackouts in the resident's local day
-- amenity_blackouts.start_date/end_date are calendar dates the admin picked
-- in local time, but the blackout trigger compared them against the booking's
-- UTC date. An evening booking on the day before a blackout (e.g. 9 Oct
-- 7pm-10pm at UTC-5 = 10 Oct 00:00-03:00 UTC) therefore looked like it
-- overlapped the blackout and was rejected with AM001.
--
-- Same approach as fastlane_visit_local_tz: the client sends its UTC offset
-- (Dart's `DateTime.timeZoneOffset`, local minus UTC, in minutes) and the
-- trigger shifts the instants back to local days before comparing.

alter table public.amenity_bookings
  add column if not exists tz_offset_minutes integer not null default 0;

create or replace function public.check_amenity_booking_not_blacked_out()
returns trigger
language plpgsql
as $$
declare
  v_offset interval := new.tz_offset_minutes * interval '1 minute';
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  if exists (
    select 1 from public.amenity_blackouts b
    where b.amenity_id = new.amenity_id
      and b.start_date <= ((new.end_time at time zone 'utc') + v_offset)::date
      and b.end_date >= ((new.start_time at time zone 'utc') + v_offset)::date
  ) then
    raise exception 'This amenity is closed for the selected dates.' using errcode = 'AM001';
  end if;

  return new;
end;
$$;
