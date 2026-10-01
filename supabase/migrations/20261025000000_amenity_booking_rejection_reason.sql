-- gates-admin: rejecting a booking (admin panel or the resident app) should
-- let whoever rejects it leave an optional note explaining why — separate
-- from `notes`, which is the requester's own note left when booking (e.g.
-- "Agregar hamaca"). Nullable, no default: most rejections still won't
-- have one.
alter table public.amenity_bookings
  add column if not exists rejection_reason text;
