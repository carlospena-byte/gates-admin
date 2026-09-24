-- gates-admin: security is view-only on amenity_bookings (reservas).
-- is_residential_member() returns true for any residential_users row
-- regardless of role, so the existing "insert self" policy let a security
-- guard create their own booking. Exclude security explicitly.

drop policy if exists "amenity_bookings: insert self" on public.amenity_bookings;
create policy "amenity_bookings: insert self"
  on public.amenity_bookings for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_residential_member(residential_id)
    and not is_residential_security(residential_id)
  );
