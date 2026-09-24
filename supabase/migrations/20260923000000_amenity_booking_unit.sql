-- amenity_bookings has no way to say which unit a reservation is for —
-- only the booking user. Add unit_id so a booking can be assigned to a
-- specific unit; nullable since existing rows predate this and the booking
-- user may not always be tied to one unit.
alter table public.amenity_bookings
  add column if not exists unit_id uuid references public.units(id) on delete set null;

create index if not exists idx_amenity_bookings_unit_id on public.amenity_bookings(unit_id);
