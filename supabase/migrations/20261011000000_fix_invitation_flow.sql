-- gates-admin: fix the invitation flow to match the intended business rules
-- (see conversation history for the full spec). Four independent fixes:
--
-- 1. Invitations now expire in 24h, not 7 days.
-- 2. create_unit_invitation records which unit_residents row it's for, and
--    auto-revokes any still-pending invitation for the same unit+email
--    before creating a new one, so there's never more than one live code
--    per resident (also makes "reinvite" work with no extra UI).
-- 3. remove_unit_resident() is the one safe way to delete a resident's
--    contact row: it also revokes pending invitations and, if the person
--    already has real access (a unit_members row), removes that too. The
--    old flow (unit_residents delete only) left an already-registered
--    resident with access after the admin "removed" them.
-- 4. unit_residents_with_status view derives active/invited/expired/
--    not_invited for the admin UI, without exposing invitation codes.

alter table public.unit_invitations
  alter column expires_at set default (now() + interval '24 hours');

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

  -- At most one live code per resident: superseding invitations (wrong
  -- email fixed, resident asks to resend, etc.) revoke whatever was still
  -- pending for this unit+email instead of leaving both around.
  update public.unit_invitations
  set status = 'revoked'
  where unit_id = _unit_id
    and email = _normalized_email
    and status = 'pending';

  loop
    _code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
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

-- The previous 3-arg overload is dropped so callers can't silently skip
-- unit_resident_id and the revoke-before-create step above.
drop function if exists public.create_unit_invitation(uuid, text, text);

-- Removes a unit_residents contact row and, unlike a plain delete, actually
-- revokes whatever access it granted: any pending invitation, and — if the
-- resident already registered and is linked via unit_members — that
-- membership too. Returns whether real access was revoked so the caller
-- can show that in a toast/confirmation.
create or replace function public.remove_unit_resident(_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _resident public.unit_residents;
  _member_user_id uuid;
  _revoked_access boolean := false;
begin
  select * into _resident from public.unit_residents where id = _id;
  if _resident is null then
    raise exception 'Resident not found';
  end if;

  if not is_residential_admin(_resident.residential_id) then
    raise exception 'Not authorized to remove this resident';
  end if;

  update public.unit_invitations
  set status = 'revoked'
  where unit_resident_id = _id
    and status = 'pending';

  select p.user_id into _member_user_id
  from public.profiles p
  join public.unit_members um on um.user_id = p.user_id
  where p.email = _resident.email
    and um.unit_id = _resident.unit_id;

  if _member_user_id is not null then
    delete from public.unit_members
    where unit_id = _resident.unit_id and user_id = _member_user_id;
    _revoked_access := true;
  end if;

  delete from public.unit_residents where id = _id;

  return _revoked_access;
end;
$$;

alter function public.remove_unit_resident(uuid) owner to postgres;
grant execute on function public.remove_unit_resident(uuid) to authenticated;

-- Computes a resident's status. security definer because a residential
-- admin's own RLS can't see profiles/unit_members rows for people who
-- aren't residential_users staff (same gap find_profile_id_by_email works
-- around) — without this, the view below would read those joins as empty
-- through an admin's session and misreport an already-registered resident
-- as merely "invited".
create or replace function public.unit_resident_status(_unit_id uuid, _email text, _unit_resident_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _is_active boolean;
  _latest_status text;
  _latest_expires timestamptz;
begin
  select exists (
    select 1
    from public.profiles p
    join public.unit_members um on um.user_id = p.user_id
    where p.email = _email and um.unit_id = _unit_id
  ) into _is_active;

  if _is_active then
    return 'active';
  end if;

  select ui.status, ui.expires_at into _latest_status, _latest_expires
  from public.unit_invitations ui
  where ui.unit_resident_id = _unit_resident_id
  order by ui.created_at desc
  limit 1;

  if _latest_status = 'pending' and _latest_expires >= now() then
    return 'invited';
  elsif _latest_status is not null then
    return 'expired';
  else
    return 'not_invited';
  end if;
end;
$$;

alter function public.unit_resident_status(uuid, text, uuid) owner to postgres;
grant execute on function public.unit_resident_status(uuid, text, uuid) to authenticated;
grant execute on function public.unit_resident_status(uuid, text, uuid) to service_role;

-- Read-only view for the admin UI: status per resident (and the unit name,
-- so it's a drop-in replacement for the "*, units(name)" embed the old
-- listByResidential query used — PostgREST can't embed across a view since
-- views carry no FK metadata), without ever exposing unit_invitations.code.
-- security_invoker so it's still governed by unit_residents' own RLS for
-- whoever queries it (not the view owner's) — an admin only ever sees rows
-- for their own residential, same as before this view existed. The status
-- computation itself goes through unit_resident_status() above instead of
-- joining profiles/unit_members/unit_invitations directly, since those
-- would otherwise be re-checked against the invoker's (admin's) RLS too.
create or replace view public.unit_residents_with_status
with (security_invoker = true)
as
select
  ur.*,
  jsonb_build_object('name', u.name) as units,
  public.unit_resident_status(ur.unit_id, ur.email, ur.id) as status
from public.unit_residents ur
left join public.units u on u.id = ur.unit_id;

grant select on public.unit_residents_with_status to authenticated;
grant select on public.unit_residents_with_status to service_role;
