-- gates-admin: FastLane link-based invite flow (resident app)
-- The resident app no longer collects a phone number or triggers a backend
-- SMS/WhatsApp send — it now asks for a reference name and an expected
-- arrival time, then shares the self-registration link itself via the
-- device's native share sheet (WhatsApp, Messages, Telegram, copy link).
--
-- The admin dashboard's phone-based flow (visitorService.createFastlane +
-- send-visit-notification) is unchanged and keeps calling this same RPC with
-- _phone/_visit_date/_notes, so _phone stays a param (now optional) and
-- _name/_arrival_time are new optional params — neither caller breaks.

drop function if exists public.create_fastlane_visit(uuid, uuid, text, date, text);

create or replace function public.create_fastlane_visit(
  _residential_id uuid,
  _unit_id uuid,
  _visit_date date,
  _phone text default null,
  _name text default null,
  _arrival_time time default null,
  _notes text default null
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
  -- reasoning as the delivery visit's optional arrivalTime.
  _valid_from := (_visit_date + coalesce(_arrival_time, '00:00:00'::time))::timestamptz;
  _valid_until := (_visit_date + 1)::timestamptz - interval '1 second';

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

alter function public.create_fastlane_visit(uuid, uuid, date, text, text, time, text) owner to postgres;
grant execute on function public.create_fastlane_visit(uuid, uuid, date, text, text, time, text) to authenticated;
