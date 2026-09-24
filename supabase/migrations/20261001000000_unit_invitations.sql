-- gates-admin: unit_invitations
-- Closes the gap documented in 20260921000000_find_profile_by_email.sql:
-- a resident who has never opened gates-app has no auth.users/profiles row,
-- so an admin can't link them to a unit via unit_members yet. This adds an
-- invite-by-code flow: an admin creates an invitation for an email (and
-- optional phone), gates-admin's send-invitation Edge Function emails the
-- code via Resend, and the resident enters that code when they register in
-- gates-app, which calls accept_unit_invitation() to create the
-- unit_members row for them.

create table if not exists public.unit_invitations (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  unit_resident_id uuid references public.unit_residents(id) on delete set null,
  email text not null,
  phone text,
  code text not null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid references public.profiles(user_id) on delete set null,
  accepted_by uuid references public.profiles(user_id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.unit_invitations drop constraint if exists unit_invitations_status_check;
alter table public.unit_invitations
  add constraint unit_invitations_status_check
  check (status in ('pending', 'accepted', 'expired', 'revoked'));

create unique index if not exists idx_unit_invitations_code on public.unit_invitations(code);
create index if not exists idx_unit_invitations_unit_id on public.unit_invitations(unit_id);
create index if not exists idx_unit_invitations_residential_id on public.unit_invitations(residential_id);

alter table public.unit_invitations enable row level security;

-- Only admins manage invitations. There's deliberately no "members view"
-- policy: the code is a bearer credential and must never be exposed via a
-- row a signed-in resident could select. accept_unit_invitation() below
-- (security definer) is the only way a resident's own session touches this
-- table.
drop policy if exists "unit_invitations: platform admin all" on public.unit_invitations;
create policy "unit_invitations: platform admin all"
  on public.unit_invitations for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_invitations: owner admin manage" on public.unit_invitations;
create policy "unit_invitations: owner admin manage"
  on public.unit_invitations for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

grant select, insert, update, delete on public.unit_invitations to authenticated;
grant select, insert, update, delete on public.unit_invitations to service_role;

-- Called by the send-invitation Edge Function (forwarding the caller's own
-- JWT, not the service role key) so the admin-permission check runs as the
-- actual admin. Generates the code here rather than in application code so
-- it's guaranteed unique and never has to be trusted from the client.
create or replace function public.create_unit_invitation(
  _unit_id uuid,
  _email text,
  _phone text default null
)
returns public.unit_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  _residential_id uuid;
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

  loop
    _code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.unit_invitations where code = _code);
  end loop;

  insert into public.unit_invitations (unit_id, residential_id, email, phone, code, created_by)
  values (_unit_id, _residential_id, lower(trim(_email)), nullif(trim(_phone), ''), _code, auth.uid())
  returning * into _invitation;

  return _invitation;
end;
$$;

alter function public.create_unit_invitation(uuid, text, text) owner to postgres;
grant execute on function public.create_unit_invitation(uuid, text, text) to authenticated;

-- Called from gates-app right after the invited resident registers (or logs
-- in, if they enter the code on the pending-link screen instead). Runs as
-- the resident's own session; security definer only for the lookup-by-code
-- and the unit_members insert, both of which are otherwise blocked by RLS
-- for a user who isn't a residential member yet.
create or replace function public.accept_unit_invitation(_code text)
returns public.unit_members
language plpgsql
security definer
set search_path = public
as $$
declare
  _invitation public.unit_invitations;
  _member public.unit_members;
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

  return _member;
end;
$$;

alter function public.accept_unit_invitation(text) owner to postgres;
grant execute on function public.accept_unit_invitation(text) to authenticated;

-- Lets an admin cancel a pending invitation (e.g. wrong email, resident
-- moved out). Deliberately restricted to pending -> revoked: an already
-- accepted/expired invitation is left alone as a record.
create or replace function public.revoke_unit_invitation(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _residential_id uuid;
begin
  select residential_id into _residential_id from public.unit_invitations where id = _id;
  if _residential_id is null then
    raise exception 'Invitation not found';
  end if;
  if not is_residential_admin(_residential_id) then
    raise exception 'Not authorized to revoke this invitation';
  end if;

  update public.unit_invitations
  set status = 'revoked'
  where id = _id and status = 'pending';
end;
$$;

alter function public.revoke_unit_invitation(uuid) owner to postgres;
grant execute on function public.revoke_unit_invitation(uuid) to authenticated;
