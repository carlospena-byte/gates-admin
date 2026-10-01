-- gates-admin: amenity blackout dates
-- Lets an admin close an amenity for a specific date or date range —
-- maintenance, board-only use, etc — on top of its regular weekly
-- `schedule`. Enforced with a BEFORE INSERT/UPDATE trigger on
-- amenity_bookings (rather than a plain check, since it has to look up a
-- sibling table), so the block applies to every client that can write to
-- amenity_bookings, not just this admin panel.

-- ----------------------------------------------------------------------------
-- Table
-- ----------------------------------------------------------------------------

create table if not exists public.amenity_blackouts (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_amenity_blackouts_amenity_id on public.amenity_blackouts(amenity_id);

-- ----------------------------------------------------------------------------
-- Trigger: reject bookings that overlap a blackout range
-- ----------------------------------------------------------------------------

create or replace function public.check_amenity_booking_not_blacked_out()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  if exists (
    select 1 from public.amenity_blackouts b
    where b.amenity_id = new.amenity_id
      and b.start_date <= (new.end_time at time zone 'utc')::date
      and b.end_date >= (new.start_time at time zone 'utc')::date
  ) then
    raise exception 'This amenity is closed for the selected dates.' using errcode = 'AM001';
  end if;

  return new;
end;
$$;

drop trigger if exists amenity_bookings_reject_blackout on public.amenity_bookings;
create trigger amenity_bookings_reject_blackout
  before insert or update on public.amenity_bookings
  for each row execute function public.check_amenity_booking_not_blacked_out();

-- ----------------------------------------------------------------------------
-- Trigger: audit log (same convention as amenity_images/services)
-- ----------------------------------------------------------------------------

drop trigger if exists audit_amenity_blackouts on public.amenity_blackouts;
create trigger audit_amenity_blackouts after insert or update or delete on public.amenity_blackouts
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.amenity_blackouts enable row level security;

-- ----------------------------------------------------------------------------
-- Policies (scoped through residential_id, same shape as amenity_images)
-- ----------------------------------------------------------------------------

drop policy if exists "amenity_blackouts: platform admin all" on public.amenity_blackouts;
create policy "amenity_blackouts: platform admin all"
  on public.amenity_blackouts for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "amenity_blackouts: owner admin manage" on public.amenity_blackouts;
create policy "amenity_blackouts: owner admin manage"
  on public.amenity_blackouts for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "amenity_blackouts: member select" on public.amenity_blackouts;
create policy "amenity_blackouts: member select"
  on public.amenity_blackouts for select
  to authenticated
  using (is_residential_member(residential_id));

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.amenity_blackouts to authenticated;
grant select, insert, update, delete on public.amenity_blackouts to service_role;
