-- gates-admin: validate_unit_invitation
-- register_screen.dart used to ask for email+password up front and only
-- redeem the invitation code afterwards — so a resident could set a
-- password before we'd even confirmed they were actually invited. This
-- RPC lets gates-app check the email+code pair *before* asking the
-- resident to choose a password or an SMS OTP, so registration is gated
-- on a real invitation from the start. Callable by `anon` (no session
-- exists yet at this point) — it only returns the unit/residential name
-- the person is joining, nothing sensitive, and doesn't consume the code
-- (accept_unit_invitation still does that once the account is created).

create or replace function public.validate_unit_invitation(_email text, _code text)
returns table(unit_name text, residential_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.unit_invitations;
begin
  select * into _invitation
  from public.unit_invitations
  where email = lower(trim(_email)) and code = upper(trim(_code));

  if _invitation is null then
    raise exception 'Invalid code or email';
  end if;
  if _invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked';
  end if;
  if _invitation.expires_at < now() then
    raise exception 'This invitation has expired';
  end if;

  return query
    select u.name, r.name
    from public.units u
    join public.residentials r on r.id = u.residential_id
    where u.id = _invitation.unit_id;
end;
$$;

alter function public.validate_unit_invitation(text, text) owner to postgres;
grant execute on function public.validate_unit_invitation(text, text) to anon, authenticated;
