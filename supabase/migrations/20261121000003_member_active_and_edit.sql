-- Settings > Users: activate/deactivate members and edit their info.
--
-- * residential_users.is_active: an inactive member keeps their row (role,
--   history) but loses all access. Every RLS helper now requires is_active,
--   so every policy that goes through them is covered at once.
-- * set_member_active: admin-only toggle. Owners can't be deactivated, nobody
--   can deactivate themselves, and only an owner can touch admin/owner rows
--   (same split as the "admin manage limited" policy). Deactivating a guard
--   (username account) also ends their open sessions, since guards have no
--   inactivity timeout.
-- * update_member_profile: admin-only edit of first/last name and phone for a
--   member of the residential (profiles is otherwise self-writable only).

alter table public.residential_users
  add column if not exists is_active boolean not null default true;

create or replace function public.is_residential_owner(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.residentials r
    where r.id = _residential_id
      and r.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'owner'
      and ru.is_active
  );
end;
$$;

create or replace function public.is_residential_admin(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role in ('admin', 'owner')
      and ru.is_active
  );
end;
$$;

create or replace function public.is_residential_security(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'security'
      and ru.is_active
  );
end;
$$;

create or replace function public.is_residential_member(_residential_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.is_active
  )
  or exists (
    select 1
    from public.unit_members um
    where um.residential_id = _residential_id
      and um.user_id = auth.uid()
  );
end;
$$;

-- Shared permission check for the two RPCs below. Returns the target's role.
create or replace function public.assert_can_manage_member(_residential_id uuid, _user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text;
begin
  if not is_residential_admin(_residential_id) then
    raise exception 'Not authorized to manage this member';
  end if;

  select ru.role into _role
  from public.residential_users ru
  where ru.residential_id = _residential_id and ru.user_id = _user_id;
  if _role is null then
    raise exception 'User is not a member of this residential';
  end if;

  -- Admin/owner rows are the owner's to manage, matching the RLS policy.
  if _role in ('admin', 'owner') and not is_residential_owner(_residential_id) then
    raise exception 'Only the owner can manage admins';
  end if;

  return _role;
end;
$$;

revoke all on function public.assert_can_manage_member(uuid, uuid) from public, anon, authenticated;

create or replace function public.set_member_active(
  _residential_id uuid,
  _user_id uuid,
  _active boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _role text := assert_can_manage_member(_residential_id, _user_id);
begin
  if _role = 'owner' then
    raise exception 'The owner cannot be deactivated';
  end if;
  if _user_id = auth.uid() then
    raise exception 'You cannot deactivate yourself';
  end if;

  update public.residential_users
  set is_active = _active
  where residential_id = _residential_id and user_id = _user_id;

  if not _active and exists (
    select 1 from public.profiles p where p.user_id = _user_id and p.username is not null
  ) then
    delete from auth.sessions where user_id = _user_id;
  end if;
end;
$$;

create or replace function public.update_member_profile(
  _residential_id uuid,
  _user_id uuid,
  _first_name text,
  _last_name text,
  _phone text
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
  perform assert_can_manage_member(_residential_id, _user_id);
  if _first is null or _last is null then
    raise exception 'First and last name are required';
  end if;

  update public.profiles
  set first_name = _first, last_name = _last, phone = nullif(trim(_phone), '')
  where user_id = _user_id;
end;
$$;

revoke all on function public.set_member_active(uuid, uuid, boolean) from public;
revoke all on function public.update_member_profile(uuid, uuid, text, text, text) from public;
grant execute on function public.set_member_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.update_member_profile(uuid, uuid, text, text, text) to authenticated;
