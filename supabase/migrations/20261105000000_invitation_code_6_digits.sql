-- gates-admin: invitation codes are now 6 digits (numeric only) instead of
-- 8 alphanumeric characters — easier for residents to read and type.
-- Existing pending 8-character codes keep working: accept/validate look
-- the code up by exact match, regardless of length.

create or replace function public.create_unit_invitation(
  _unit_id uuid,
  _email text,
  _phone text default null,
  _unit_resident_id uuid default null
)
returns public.unit_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  _residential_id uuid;
  _normalized_email text;
  _code text;
  _invitation public.unit_invitations;
begin
  select residential_id into _residential_id from public.units where id = _unit_id;
  if _residential_id is null then
    raise exception 'Unit not found';
  end if;

  if not is_residential_admin(_residential_id) then
    raise exception 'Not authorized to invite residents for this residential';
  end if;

  _normalized_email := lower(trim(_email));

  update public.unit_invitations
  set status = 'revoked'
  where unit_id = _unit_id
    and email = _normalized_email
    and status = 'pending';

  loop
    _code := lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (select 1 from public.unit_invitations where code = _code);
  end loop;

  insert into public.unit_invitations (unit_id, residential_id, unit_resident_id, email, phone, code, created_by)
  values (_unit_id, _residential_id, _unit_resident_id, _normalized_email, nullif(trim(_phone), ''), _code, auth.uid())
  returning * into _invitation;

  return _invitation;
end;
$$;

alter function public.create_unit_invitation(uuid, text, text, uuid) owner to postgres;
grant execute on function public.create_unit_invitation(uuid, text, text, uuid) to authenticated;
