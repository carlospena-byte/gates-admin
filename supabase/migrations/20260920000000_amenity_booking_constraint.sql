-- gates-admin: amenity booking anti-double-booking constraint
-- amenity_bookings has existed since the baseline with full RLS but no
-- protection against two overlapping bookings for the same amenity — only
-- the frontend could ever have prevented that. This adds a real DB-level
-- guarantee via an exclusion constraint, safe under concurrent inserts.

create extension if not exists btree_gist;

alter table public.amenity_bookings drop constraint if exists amenity_bookings_no_overlap;
alter table public.amenity_bookings
  add constraint amenity_bookings_no_overlap
  exclude using gist (
    amenity_id with =,
    tstzrange(start_time, end_time) with &&
  )
  where (status <> 'cancelled');

-- The table has existed since the baseline with zero indexes.
create index if not exists idx_amenity_bookings_amenity_id on public.amenity_bookings(amenity_id, start_time);
