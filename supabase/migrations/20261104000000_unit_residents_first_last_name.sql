-- gates-admin: split unit_residents.full_name into first_name/last_name
--
-- The admin's "Add resident" form captured a single free-text full_name,
-- and accept_unit_invitation later tried to reconstruct
-- profiles.first_name/last_name from it by splitting on the first space
-- (see 20261003000000_accept_invitation_fills_profile.sql) — lossy for
-- compound last names, and already known to be unreliable (see the
-- comment on bookerNameById in ReservationsPage.tsx). Capturing structured
-- first_name/last_name once here removes the split entirely.
--
-- full_name becomes a generated column so every read-only consumer
-- (unit_residents_with_status, validate_unit_invitation, the admin table,
-- the mobile invitation-summary screen) keeps working unchanged.

alter table public.unit_residents
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.unit_residents
set
  first_name = coalesce(nullif(split_part(full_name, ' ', 1), ''), full_name),
  last_name = nullif(trim(substring(full_name from length(split_part(full_name, ' ', 1)) + 1)), '')
where first_name is null;

alter table public.unit_residents
  alter column first_name set not null;

-- unit_residents_with_status depends on full_name via `ur.*` — drop and
-- recreate it around the column swap (same definition as
-- 20261011000000_fix_invitation_flow.sql).
drop view if exists public.unit_residents_with_status;

alter table public.unit_residents
  drop column full_name;

alter table public.unit_residents
  add column full_name text generated always as (
    case
      when last_name is not null and last_name <> '' then first_name || ' ' || last_name
      else first_name
    end
  ) stored;

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

-- accept_unit_invitation: copy first_name/last_name directly from
-- unit_residents instead of re-splitting full_name. Still only fills
-- blanks — never overwrites a name the resident already set themselves.
--
-- Also fixes a latent bug in the `_resident is not null` check: for a
-- composite/row variable, Postgres's IS NOT NULL is only true when EVERY
-- field is non-null. Since unit_residents.phone is optional, any resident
-- added without a phone made `_resident is not null` evaluate to false,
-- silently skipping the whole profile fill. Checking `_resident.id`
-- (the never-null primary key) instead of the whole row fixes this.
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

  if _resident.id is not null then
    update public.profiles
    set
      first_name = coalesce(nullif(trim(first_name), ''), _resident.first_name),
      last_name = coalesce(nullif(trim(last_name), ''), _resident.last_name),
      phone = coalesce(nullif(trim(phone), ''), _resident.phone)
    where user_id = auth.uid();
  end if;

  return _member;
end;
$$;

alter function public.accept_unit_invitation(text) owner to postgres;
grant execute on function public.accept_unit_invitation(text) to authenticated;
