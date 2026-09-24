-- Follow-up to 20261004000000_residents_are_residential_members.sql: the
-- unit_members/units/amenities/incidents policies all route through
-- is_residential_member(), which now recognizes residents — but
-- "residentials: select platform or member" never called that helper; it
-- inlined its own is_platform_admin()/is_residential_owner()/
-- residential_users check instead. That left residents unable to SELECT
-- their own residentials row, which silently drops it (inner join) out of
-- the gates-app's `unit_members -> units -> residentials` embedded query
-- even though unit_members and units were individually visible —
-- confirmed via `set role authenticated` + `set request.jwt.claims`
-- against cepa1988@live.com.
drop policy if exists "residentials: select platform or member" on public.residentials;
create policy "residentials: select platform or member"
  on public.residentials for select
  to authenticated
  using (is_platform_admin() or is_residential_member(id));
