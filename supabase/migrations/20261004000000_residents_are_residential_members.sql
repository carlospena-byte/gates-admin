-- gates-admin: a resident linked only via unit_members (the normal path
-- after accepting an invitation) was invisible to is_residential_member(),
-- which only ever checked residential_users (staff: owner/admin/security).
-- Since ~20 RLS policies across unit_members, units, residentials,
-- amenities, incidents, visitors, announcements and storage gate on
-- is_residential_member(), a real resident could never see their own
-- membership, unit, or residential data from the mobile app — the
-- gates-app always showed "Cuenta pendiente" even when an admin had
-- already linked them (confirmed against cepa1988@live.com: present in
-- both unit_members and unit_residents, but is_residential_member()
-- returned false).
--
-- Fix: widen is_residential_member() to also return true for a
-- unit_members row belonging to the current user in that residential,
-- alongside the existing owner/residential_users checks. Same signature,
-- language, security definer and search_path as the current definition in
-- 20260921000001_fix_rls_helper_recursion.sql — only the body changes, so
-- every policy built on top of it picks this up automatically.
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
  )
  or exists (
    select 1
    from public.unit_members um
    where um.residential_id = _residential_id
      and um.user_id = auth.uid()
  );
end;
$$;
