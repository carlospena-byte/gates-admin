-- Settings > Users: capture first/last name when staff add a member by email.
--
-- profiles is self-writable only, so an admin can't set another user's name
-- directly. This RPC lets a residential admin set first_name/last_name for a
-- user who is already a member of that residential (same security-definer
-- pattern as update_unit_resident).

create or replace function public.set_member_name(
  _residential_id uuid,
  _user_id uuid,
  _first_name text,
  _last_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _first text := nullif(trim(_first_name), '');
  _last text := nullif(trim(_last_name), '');
begin
  if not is_residential_admin(_residential_id) then
    raise exception 'Not authorized to edit this member';
  end if;
  if _first is null or _last is null then
    raise exception 'First and last name are required';
  end if;
  if not exists (
    select 1 from public.residential_users ru
    where ru.residential_id = _residential_id and ru.user_id = _user_id
  ) then
    raise exception 'User is not a member of this residential';
  end if;

  update public.profiles
  set first_name = _first, last_name = _last
  where user_id = _user_id;
end;
$$;

revoke all on function public.set_member_name(uuid, uuid, text, text) from public;
grant execute on function public.set_member_name(uuid, uuid, text, text) to authenticated;
