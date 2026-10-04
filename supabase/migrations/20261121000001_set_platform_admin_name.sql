-- Platform admin panel: capture first/last name when adding an admin by email.
-- Same reasoning as set_member_name — profiles is self-writable only, so a
-- platform admin sets another admin's name through this security-definer RPC.

create or replace function public.set_platform_admin_name(
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
  if not is_platform_admin() then
    raise exception 'Not authorized';
  end if;
  if _first is null or _last is null then
    raise exception 'First and last name are required';
  end if;
  if not exists (select 1 from public.platform_admins pa where pa.user_id = _user_id) then
    raise exception 'User is not a platform admin';
  end if;

  update public.profiles
  set first_name = _first, last_name = _last
  where user_id = _user_id;
end;
$$;

revoke all on function public.set_platform_admin_name(uuid, text, text) from public;
grant execute on function public.set_platform_admin_name(uuid, text, text) to authenticated;
