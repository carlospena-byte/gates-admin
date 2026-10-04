-- Resident edit + two-way name/phone sync (last edit wins)
--
-- unit_residents (the contact the admin typed) and profiles (what the
-- resident edits in the mobile app) held the same name/phone but were only
-- reconciled once, at invitation acceptance. Now:
--
--  * Admin edits go through update_unit_resident(), which writes
--    unit_residents and, when the resident already has an account linked to
--    that unit, pushes first_name/last_name/phone into profiles.
--  * App edits to profiles are mirrored into every unit_residents row that
--    belongs to that account (same email, unit the user is a member of).
--
-- Whichever side was edited last overwrites the other. Email is owned by
-- auth.users for registered residents, so it can only be changed here while
-- the resident has no account yet.

create or replace function public.update_unit_resident(
  _id uuid,
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _unit_id uuid
)
returns public.unit_residents
language plpgsql
security definer
set search_path = public
as $$
declare
  _resident public.unit_residents;
  _user_id uuid;
  _new_unit public.units;
  _first text := nullif(trim(_first_name), '');
  _last text := nullif(trim(_last_name), '');
  _mail text := trim(_email);
  _tel text := nullif(trim(_phone), '');
begin
  select * into _resident from public.unit_residents where id = _id for update;
  if _resident.id is null then
    raise exception 'Resident not found';
  end if;
  if not is_residential_admin(_resident.residential_id) then
    raise exception 'Not authorized to edit this resident';
  end if;
  if _first is null then
    raise exception 'First name is required';
  end if;
  if _mail = '' then
    raise exception 'Email is required';
  end if;

  select * into _new_unit from public.units where id = _unit_id;
  if _new_unit.id is null or _new_unit.residential_id <> _resident.residential_id then
    raise exception 'Invalid unit';
  end if;

  select p.user_id into _user_id
  from public.profiles p
  join public.unit_members um on um.user_id = p.user_id
  where p.email = _resident.email and um.unit_id = _resident.unit_id;

  if _user_id is not null and lower(_mail) <> lower(_resident.email) then
    raise exception 'Cannot change the email of a resident who already has an account';
  end if;

  -- Pending invitations point at the old email/unit; revoke them so the
  -- admin re-invites with the corrected data.
  if lower(_mail) <> lower(_resident.email) or _unit_id <> _resident.unit_id then
    update public.unit_invitations
    set status = 'revoked'
    where unit_resident_id = _id and status = 'pending';
  end if;

  if _user_id is not null and _unit_id <> _resident.unit_id then
    delete from public.unit_members
    where unit_id = _resident.unit_id and user_id = _user_id;
    insert into public.unit_members (unit_id, residential_id, user_id)
    values (_unit_id, _resident.residential_id, _user_id)
    on conflict (unit_id, user_id) do nothing;
  end if;

  update public.unit_residents
  set first_name = _first,
      last_name = _last,
      email = _mail,
      phone = _tel,
      unit_id = _unit_id
  where id = _id
  returning * into _resident;

  if _user_id is not null then
    update public.profiles
    set first_name = _first, last_name = _last, phone = _tel
    where user_id = _user_id;
  end if;

  return _resident;
end;
$$;

alter function public.update_unit_resident(uuid, text, text, text, text, uuid) owner to postgres;
grant execute on function public.update_unit_resident(uuid, text, text, text, text, uuid) to authenticated;

-- App -> admin direction.
create or replace function public.sync_profile_to_unit_residents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.unit_residents ur
  set first_name = coalesce(nullif(trim(new.first_name), ''), ur.first_name),
      last_name = nullif(trim(new.last_name), ''),
      phone = nullif(trim(new.phone), '')
  where ur.email = new.email
    and ur.unit_id in (select um.unit_id from public.unit_members um where um.user_id = new.user_id)
    and (
      ur.first_name is distinct from coalesce(nullif(trim(new.first_name), ''), ur.first_name)
      or ur.last_name is distinct from nullif(trim(new.last_name), '')
      or ur.phone is distinct from nullif(trim(new.phone), '')
    );
  return new;
end;
$$;

drop trigger if exists sync_profile_to_unit_residents on public.profiles;
create trigger sync_profile_to_unit_residents
after update of first_name, last_name, phone on public.profiles
for each row
when (
  old.first_name is distinct from new.first_name
  or old.last_name is distinct from new.last_name
  or old.phone is distinct from new.phone
)
execute procedure public.sync_profile_to_unit_residents();
