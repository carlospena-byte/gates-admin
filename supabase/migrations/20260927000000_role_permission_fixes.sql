-- gates-admin: role permission fixes
-- 1. security can view amenity_bookings (reservas) for their residential,
--    matching the existing security access to visitors/access_logs.
-- 2. admin can manage other admin residential_users, not just
--    security/member — still can't touch owner rows (is_residential_owner
--    is checked separately and takes precedence via the owner policy).

-- ----------------------------------------------------------------------------
-- amenity_bookings: security view
-- ----------------------------------------------------------------------------

drop policy if exists "amenity_bookings: security view" on public.amenity_bookings;
create policy "amenity_bookings: security view"
  on public.amenity_bookings for select
  to authenticated
  using (is_residential_security(residential_id));

-- ----------------------------------------------------------------------------
-- residential_users: admin can now also manage 'admin' rows
-- ----------------------------------------------------------------------------

drop policy if exists "residential_users: admin manage limited" on public.residential_users;
create policy "residential_users: admin manage limited"
  on public.residential_users for all
  to authenticated
  using (
    is_residential_admin(residential_id)
    and not is_residential_owner(residential_id)
    and role in ('admin', 'member', 'security')
  )
  with check (
    is_residential_admin(residential_id)
    and not is_residential_owner(residential_id)
    and role in ('admin', 'member', 'security')
  );
