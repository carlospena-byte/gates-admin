-- gates-admin: accept_unit_invitation also fills the resident's profile
-- complete_profile_screen.dart asks every new resident to retype their
-- name and phone, because handle_auth_user_created only ever fills
-- profiles.email. For an invited resident that's redundant — the admin
-- already captured full_name/phone in unit_residents when they created
-- the invitation. Once accept_unit_invitation links the account, copy
-- that over into profiles too, so the resident only sees
-- complete_profile_screen if something's still missing (e.g. no matching
-- unit_residents row, or they signed up by phone with no name on file).
-- Only fills blanks — never overwrites a name/phone the resident already
-- set for themselves (e.g. on a retry after changing their profile).

create or replace function public.accept_unit_invitation(_code text)
returns public.unit_members
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.unit_invitations;
  _member public.unit_members;
  _resident public.unit_residents;
begin
  select * into _invitation
  from public.unit_invitations
  where code = upper(trim(_code))
  for update;

  if _invitation is null then
    raise exception 'Invalid invitation code';
  end if;
  if _invitation.status <> 'pending' then
    raise exception 'This invitation has already been used or revoked';
  end if;
  if _invitation.expires_at < now() then
    update public.unit_invitations set status = 'expired' where id = _invitation.id;
    raise exception 'This invitation has expired';
  end if;

  insert into public.unit_members (unit_id, residential_id, user_id)
  values (_invitation.unit_id, _invitation.residential_id, auth.uid())
  on conflict (unit_id, user_id) do nothing
  returning * into _member;

  update public.unit_invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = _invitation.id;

  if _member is null then
    select * into _member from public.unit_members
    where unit_id = _invitation.unit_id and user_id = auth.uid();
  end if;

  select * into _resident
  from public.unit_residents
  where unit_id = _invitation.unit_id and email = _invitation.email
  limit 1;

  if _resident is not null then
    update public.profiles
    set
      first_name = coalesce(nullif(trim(first_name), ''), split_part(_resident.full_name, ' ', 1)),
      last_name = coalesce(
        nullif(trim(last_name), ''),
        nullif(trim(substring(_resident.full_name from length(split_part(_resident.full_name, ' ', 1)) + 1)), '')
      ),
      phone = coalesce(nullif(trim(phone), ''), _resident.phone)
    where user_id = auth.uid();
  end if;

  return _member;
end;
$$;

alter function public.accept_unit_invitation(text) owner to postgres;
grant execute on function public.accept_unit_invitation(text) to authenticated;
