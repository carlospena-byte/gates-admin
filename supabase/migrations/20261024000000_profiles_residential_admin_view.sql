-- gates-admin: the reservations admin table shows "Reservado por" as blank
-- for every booking made by a resident, because the only policy meant to
-- let staff read another user's profile — "profiles: residential members
-- view" — only ever checks residential_users (owner/admin/security), the
-- same staff-only table is_residential_member() used to gate on before it
-- was widened in 20261004000000_residents_are_residential_members.sql.
-- Residents are linked via unit_members instead, so that policy's inner
-- exists() never matches a resident's profile, and PostgREST silently
-- returns null for the joined `profiles` row rather than erroring — the
-- booking list itself still loads, just without the name/email.
--
-- Fix: add a policy letting a residential admin/owner (is_residential_admin)
-- read the profile of anyone linked to that residential via either
-- unit_members or residential_users, mirroring how is_residential_member()
-- was widened rather than touching the existing "residential members view"
-- policy (kept as-is for staff-to-staff visibility).
drop policy if exists "profiles: residential admin view" on public.profiles;
create policy "profiles: residential admin view"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.unit_members um
      where um.user_id = profiles.user_id
        and is_residential_admin(um.residential_id)
    )
    or exists (
      select 1
      from public.residential_users ru
      where ru.user_id = profiles.user_id
        and is_residential_admin(ru.residential_id)
    )
  );
