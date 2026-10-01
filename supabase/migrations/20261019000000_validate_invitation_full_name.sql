-- gates-admin: validate_unit_invitation also returns the resident's name
-- gates-app's registration flow shows a "you're joining X" summary right
-- before sending the sign-in code, so the resident can double-check the
-- unit/residential/name an admin entered before they confirm — this adds
-- full_name to that summary, sourced from the linked unit_residents row
-- (falling back to a unit_id+email match for older invitations created
-- before create_unit_invitation started recording unit_resident_id; see
-- accept_unit_invitation for the same fallback pattern).

drop function if exists public.validate_unit_invitation(text);

create function public.validate_unit_invitation(_code text)
returns table(unit_name text, residential_name text, email text, phone text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.unit_invitations;
  _full_name text;
begin
  select * into _invitation
  from public.unit_invitations
  where code = upper(trim(_code));

  if _invitation is null then
    raise exception 'Invalid invitation code';
  end if;
  if _invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked';
  end if;
  if _invitation.expires_at < now() then
    raise exception 'This invitation has expired';
  end if;

  select ur.full_name into _full_name
  from public.unit_residents ur
  where ur.id = _invitation.unit_resident_id;

  if _full_name is null then
    select ur.full_name into _full_name
    from public.unit_residents ur
    where ur.unit_id = _invitation.unit_id and ur.email = _invitation.email
    limit 1;
  end if;

  return query
    select u.name, r.name, _invitation.email, _invitation.phone, _full_name
    from public.units u
    join public.residentials r on r.id = u.residential_id
    where u.id = _invitation.unit_id;
end;
$$;

alter function public.validate_unit_invitation(text) owner to postgres;
grant execute on function public.validate_unit_invitation(text) to anon, authenticated;
