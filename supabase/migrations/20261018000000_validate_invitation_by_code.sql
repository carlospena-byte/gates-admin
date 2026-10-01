-- gates-admin: validate_unit_invitation now takes only the code
-- The "Valida tu código" screen in gates-app (Figma node 61:454) only asks
-- the resident for their 8-character invitation code, not their email —
-- matching accept_unit_invitation(_code), which has only ever looked the
-- invitation up by code (it's a unique, unguessable bearer credential; see
-- unit_invitations.code's unique index in 20261001000000_unit_invitations.sql).
-- Re-typing the email added friction without adding real security, so this
-- drops it from validate_unit_invitation to match, and returns the email
-- (and phone, if on file) that was already invited so gates-app can send
-- the sign-in code straight away instead of asking the resident to type
-- their own email again right after they just typed their code.

drop function if exists public.validate_unit_invitation(text);

create function public.validate_unit_invitation(_code text)
returns table(unit_name text, residential_name text, email text, phone text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.unit_invitations;
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

  return query
    select u.name, r.name, _invitation.email, _invitation.phone
    from public.units u
    join public.residentials r on r.id = u.residential_id
    where u.id = _invitation.unit_id;
end;
$$;

alter function public.validate_unit_invitation(text) owner to postgres;
grant execute on function public.validate_unit_invitation(text) to anon, authenticated;

drop function if exists public.validate_unit_invitation(text, text);
