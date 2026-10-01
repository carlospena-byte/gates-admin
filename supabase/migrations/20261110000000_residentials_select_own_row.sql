-- Fix: creating a residential failed with
--   new row violates row-level security policy for table "residentials"
--
-- residentialService.create() does insert(...).select().single(), i.e.
-- INSERT ... RETURNING. RETURNING rows must also pass the SELECT policy.
-- That policy (20261004000001) only called is_platform_admin() /
-- is_residential_member(id). Those are STABLE functions, so they run on the
-- statement's snapshot and cannot see the row being inserted: the owner is
-- not yet in residential_users and the residentials row is invisible to the
-- function's lookup. The check returned false, and Postgres reports a failed
-- RETURNING check with the INSERT-policy error message.
--
-- Checking owner_user_id on the row itself needs no lookup, so it works
-- during the insert.
drop policy if exists "residentials: select platform or member" on public.residentials;
create policy "residentials: select platform or member"
  on public.residentials for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or is_platform_admin()
    or is_residential_member(id)
  );
