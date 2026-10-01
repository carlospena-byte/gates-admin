-- gates-admin: fix FastLane links expiring hours before the resident's own
-- end of day.
--
-- create_fastlane_visit computed valid_from/valid_until by casting
-- `_visit_date` (and `_visit_date + 1`) straight to timestamptz. Postgres
-- resolves that cast using the DATABASE's timezone (UTC on Supabase), not
-- the resident's — so "valid until end of _visit_date" actually meant end of
-- day UTC, which for any negative-UTC-offset resident (e.g. Mexico City,
-- UTC-6) is only ~18:00 local. A visit created for "today" could already
-- read as expired (410 from fastlane-submit) hours before local midnight.
--
-- Fix: accept the caller's UTC offset (minutes, same sign convention as
-- Dart's `DateTime.timeZoneOffset` — local minus UTC) and shift the
-- UTC-anchored boundary back by that offset to land on the resident's own
-- local midnight instead. Defaults to 0 (old UTC-anchored behavior) so the
-- admin dashboard caller (visitorService.createFastlane), which doesn't pass
-- it yet, is unaffected.

drop function if exists public.create_fastlane_visit(uuid, uuid, date, text, text, time, text);

create or replace function public.create_fastlane_visit(
  _residential_id uuid,
  _unit_id uuid,
  _visit_date date,
  _phone text default null,
  _name text default null,
  _arrival_time time default null,
  _notes text default null,
  _tz_offset_minutes integer default 0
)
returns public.visitors
language plpgsql
security definer
set search_path = public
as $$
declare
  _code text;
  _visitor public.visitors;
  _is_member boolean;
  _valid_from timestamptz;
  _valid_until timestamptz;
begin
  if not (is_residential_admin(_residential_id) or is_residential_security(_residential_id)) then
    select exists(
      select 1 from public.unit_members
      where unit_id = _unit_id and user_id = auth.uid()
    ) into _is_member;

    if not _is_member then
      raise exception 'Not authorized to create a visit for this unit';
    end if;
  end if;

  loop
    _code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.visitors where access_code = _code);
  end loop;

  -- Arrival time narrows access to start then instead of midnight, same
  -- reasoning as the delivery visit's optional arrivalTime. The UTC cast
  -- anchors to _visit_date at UTC midnight; subtracting the local offset
  -- shifts that instant to _visit_date's midnight in the caller's own
  -- timezone instead.
  _valid_from := (_visit_date + coalesce(_arrival_time, '00:00:00'::time))::timestamptz
    - (_tz_offset_minutes * interval '1 minute');
  _valid_until := ((_visit_date + 1)::timestamptz - interval '1 second')
    - (_tz_offset_minutes * interval '1 minute');

  insert into public.visitors (
    residential_id, unit_id, invited_by, name, phone, visit_type, status,
    access_code, valid_from, valid_until, notes
  )
  values (
    _residential_id, _unit_id, auth.uid(), _name, _phone, 'fastlane', 'pending_registration',
    _code, _valid_from, _valid_until, _notes
  )
  returning * into _visitor;

  return _visitor;
end;
$$;

alter function public.create_fastlane_visit(uuid, uuid, date, text, text, time, text, integer) owner to postgres;
grant execute on function public.create_fastlane_visit(uuid, uuid, date, text, text, time, text, integer) to authenticated;
