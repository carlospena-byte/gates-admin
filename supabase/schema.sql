-- gates-admin baseline schema + RLS (canonical)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Utility
-- ----------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Core tables
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.residentials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references public.profiles(user_id),
  plan_type text,
  is_active boolean not null default true,
  address text,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.residential_users (
  residential_id uuid not null references public.residentials(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (residential_id, user_id)
);

alter table public.residential_users
  drop constraint if exists residential_users_role_check;
alter table public.residential_users
  add constraint residential_users_role_check
  check (role = any (array['owner'::text, 'admin'::text, 'security'::text, 'member'::text]));

create table if not exists public.unit_types (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.addon_types (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.addons (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  addon_type_id uuid not null references public.addon_types(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

-- Hierarchical buildings/floors
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, name)
);

-- Dynamic location types + hierarchical locations (separate from buildings/floors)
create table if not exists public.location_types (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, code)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  type text not null,
  parent_id uuid references public.locations(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name, parent_id)
);

-- Backup table (legacy shape, locked down by RLS)
create table if not exists public.locations_backup (
  id uuid,
  residential_id uuid,
  block_or_building text,
  street_or_floor text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
);

-- Units + relations
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  unit_type_id uuid references public.unit_types(id) on delete set null,
  building_id uuid references public.buildings(id) on delete set null,
  floor_id uuid references public.floors(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.unit_members (
  unit_id uuid not null references public.units(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (unit_id, user_id)
);

create table if not exists public.unit_addons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (unit_id, addon_id)
);

-- Amenities
create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  location text,
  capacity integer,
  requires_booking boolean not null default false,
  created_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null check (status in ('pending', 'confirmed', 'cancelled')) default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Triggers / indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_units_residential_id on public.units(residential_id);
create index if not exists idx_units_owner_user_id on public.units(owner_user_id);
create index if not exists idx_units_unit_type_id on public.units(unit_type_id);
create index if not exists idx_units_building_id on public.units(building_id);
create index if not exists idx_units_floor_id on public.units(floor_id);

create index if not exists idx_unit_types_residential_id on public.unit_types(residential_id);
create index if not exists idx_addon_types_residential_id on public.addon_types(residential_id);
create index if not exists idx_addons_residential_id on public.addons(residential_id);
create index if not exists idx_addons_addon_type_id on public.addons(addon_type_id);
create index if not exists idx_unit_addons_unit_id on public.unit_addons(unit_id);
create index if not exists idx_unit_addons_addon_id on public.unit_addons(addon_id);
create index if not exists idx_buildings_residential_id on public.buildings(residential_id);
create index if not exists idx_floors_building_id on public.floors(building_id);
create index if not exists idx_locations_residential_id on public.locations(residential_id);
create index if not exists idx_locations_parent_id on public.locations(parent_id);
create index if not exists idx_locations_type on public.locations(type);
create index if not exists idx_location_types_residential_id on public.location_types(residential_id);
create index if not exists idx_location_types_code on public.location_types(code);

drop trigger if exists update_unit_types_updated_at on public.unit_types;
create trigger update_unit_types_updated_at before update on public.unit_types
for each row execute function public.update_updated_at_column();

drop trigger if exists update_addon_types_updated_at on public.addon_types;
create trigger update_addon_types_updated_at before update on public.addon_types
for each row execute function public.update_updated_at_column();

drop trigger if exists update_addons_updated_at on public.addons;
create trigger update_addons_updated_at before update on public.addons
for each row execute function public.update_updated_at_column();

drop trigger if exists update_buildings_updated_at on public.buildings;
create trigger update_buildings_updated_at before update on public.buildings
for each row execute function public.update_updated_at_column();

drop trigger if exists update_floors_updated_at on public.floors;
create trigger update_floors_updated_at before update on public.floors
for each row execute function public.update_updated_at_column();

drop trigger if exists update_locations_updated_at on public.locations;
create trigger update_locations_updated_at before update on public.locations
for each row execute function public.update_updated_at_column();

drop trigger if exists update_location_types_updated_at on public.location_types;
create trigger update_location_types_updated_at before update on public.location_types
for each row execute function public.update_updated_at_column();

drop trigger if exists update_units_updated_at on public.units;
create trigger update_units_updated_at before update on public.units
for each row execute function public.update_updated_at_column();

-- Keep profiles in sync with auth.users (email)
create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

-- ----------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER to bypass RLS recursion)
-- ----------------------------------------------------------------------------

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

create or replace function public.is_residential_owner(_residential_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residentials r
    where r.id = _residential_id
      and r.owner_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'owner'
  );
$$;

create or replace function public.is_residential_admin(_residential_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role in ('admin', 'owner')
  );
$$;

create or replace function public.is_residential_security(_residential_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
      and ru.role = 'security'
  );
$$;

create or replace function public.is_residential_member(_residential_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_residential_owner(_residential_id)
  or exists (
    select 1
    from public.residential_users ru
    where ru.residential_id = _residential_id
      and ru.user_id = auth.uid()
  );
$$;

alter function public.is_platform_admin() owner to postgres;
alter function public.is_residential_owner(uuid) owner to postgres;
alter function public.is_residential_admin(uuid) owner to postgres;
alter function public.is_residential_security(uuid) owner to postgres;
alter function public.is_residential_member(uuid) owner to postgres;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_residential_owner(uuid) to authenticated;
grant execute on function public.is_residential_admin(uuid) to authenticated;
grant execute on function public.is_residential_security(uuid) to authenticated;
grant execute on function public.is_residential_member(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.residentials enable row level security;
alter table public.residential_users enable row level security;
alter table public.units enable row level security;
alter table public.unit_members enable row level security;
alter table public.unit_types enable row level security;
alter table public.addon_types enable row level security;
alter table public.addons enable row level security;
alter table public.unit_addons enable row level security;
alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.location_types enable row level security;
alter table public.locations enable row level security;
alter table public.locations_backup enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles: select self" on public.profiles;
create policy "profiles: select self"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "profiles: residential members view" on public.profiles;
create policy "profiles: residential members view"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.residential_users ru1
      where ru1.user_id = profiles.user_id
        and exists (
          select 1
          from public.residential_users ru2
          where ru2.user_id = auth.uid()
            and ru2.residential_id = ru1.residential_id
        )
    )
  );

drop policy if exists "profiles: platform admin all" on public.profiles;
create policy "profiles: platform admin all"
  on public.profiles for select
  to authenticated
  using (is_platform_admin());

drop policy if exists "profiles: upsert self" on public.profiles;
create policy "profiles: upsert self"
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "profiles: update self" on public.profiles;
create policy "profiles: update self"
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- platform_admins (read self only; managed by service role / dashboard)
drop policy if exists "platform_admins: select self" on public.platform_admins;
create policy "platform_admins: select self"
  on public.platform_admins for select
  to authenticated
  using (user_id = auth.uid());

-- residentials
drop policy if exists "residentials: select platform or member" on public.residentials;
create policy "residentials: select platform or member"
  on public.residentials for select
  to authenticated
  using (
    is_platform_admin()
    or is_residential_owner(residentials.id)
    or exists (
      select 1
      from public.residential_users ru
      where ru.residential_id = residentials.id
        and ru.user_id = auth.uid()
    )
  );

drop policy if exists "residentials: insert owner" on public.residentials;
create policy "residentials: insert owner"
  on public.residentials for insert
  to authenticated
  with check (owner_user_id = auth.uid());

drop policy if exists "residentials: update owner" on public.residentials;
create policy "residentials: update owner"
  on public.residentials for update
  to authenticated
  using (is_platform_admin() or is_residential_owner(residentials.id))
  with check (is_platform_admin() or is_residential_owner(residentials.id));

-- residential_users
drop policy if exists "residential_users: platform admin all" on public.residential_users;
create policy "residential_users: platform admin all"
  on public.residential_users for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "residential_users: owner manage all" on public.residential_users;
create policy "residential_users: owner manage all"
  on public.residential_users for all
  to authenticated
  using (is_residential_owner(residential_id))
  with check (
    is_residential_owner(residential_id)
    and (
      role != 'owner'
      or exists (
        select 1
        from public.residentials r
        where r.id = residential_id
          and r.owner_user_id = auth.uid()
      )
    )
  );

drop policy if exists "residential_users: admin manage limited" on public.residential_users;
create policy "residential_users: admin manage limited"
  on public.residential_users for all
  to authenticated
  using (
    is_residential_admin(residential_id)
    and not is_residential_owner(residential_id)
    and role in ('member', 'security')
  )
  with check (
    is_residential_admin(residential_id)
    and not is_residential_owner(residential_id)
    and role in ('member', 'security')
  );

drop policy if exists "residential_users: members view all" on public.residential_users;
create policy "residential_users: members view all"
  on public.residential_users for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

drop policy if exists "residential_users: self view" on public.residential_users;
create policy "residential_users: self view"
  on public.residential_users for select
  to authenticated
  using (user_id = auth.uid());

-- units
drop policy if exists "units: platform admin all" on public.units;
create policy "units: platform admin all"
  on public.units for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "units: owner admin manage" on public.units;
create policy "units: owner admin manage"
  on public.units for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "units: security member view" on public.units;
create policy "units: security member view"
  on public.units for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- unit_members
drop policy if exists "unit_members: platform admin all" on public.unit_members;
create policy "unit_members: platform admin all"
  on public.unit_members for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_members: owner admin manage" on public.unit_members;
create policy "unit_members: owner admin manage"
  on public.unit_members for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_members: members view" on public.unit_members;
create policy "unit_members: members view"
  on public.unit_members for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- unit_types
drop policy if exists "unit_types: platform admin all" on public.unit_types;
create policy "unit_types: platform admin all"
  on public.unit_types for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_types: owner admin manage" on public.unit_types;
create policy "unit_types: owner admin manage"
  on public.unit_types for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_types: members view" on public.unit_types;
create policy "unit_types: members view"
  on public.unit_types for select
  to authenticated
  using (is_residential_member(residential_id));

-- addon_types
drop policy if exists "addon_types: platform admin all" on public.addon_types;
create policy "addon_types: platform admin all"
  on public.addon_types for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "addon_types: owner admin manage" on public.addon_types;
create policy "addon_types: owner admin manage"
  on public.addon_types for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "addon_types: members view" on public.addon_types;
create policy "addon_types: members view"
  on public.addon_types for select
  to authenticated
  using (is_residential_member(residential_id));

-- addons
drop policy if exists "addons: platform admin all" on public.addons;
create policy "addons: platform admin all"
  on public.addons for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "addons: owner admin manage" on public.addons;
create policy "addons: owner admin manage"
  on public.addons for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "addons: members view" on public.addons;
create policy "addons: members view"
  on public.addons for select
  to authenticated
  using (is_residential_member(residential_id));

-- unit_addons (residential checked via units)
drop policy if exists "unit_addons: platform admin all" on public.unit_addons;
create policy "unit_addons: platform admin all"
  on public.unit_addons for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_addons: owner admin manage" on public.unit_addons;
create policy "unit_addons: owner admin manage"
  on public.unit_addons for all
  to authenticated
  using (
    exists (
      select 1
      from public.units u
      where u.id = unit_addons.unit_id
        and is_residential_admin(u.residential_id)
    )
  )
  with check (
    exists (
      select 1
      from public.units u
      where u.id = unit_addons.unit_id
        and is_residential_admin(u.residential_id)
    )
  );

drop policy if exists "unit_addons: members view" on public.unit_addons;
create policy "unit_addons: members view"
  on public.unit_addons for select
  to authenticated
  using (
    exists (
      select 1
      from public.units u
      where u.id = unit_addons.unit_id
        and is_residential_member(u.residential_id)
    )
  );

-- amenities
drop policy if exists "amenities: platform admin all" on public.amenities;
create policy "amenities: platform admin all"
  on public.amenities for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "amenities: owner admin manage" on public.amenities;
create policy "amenities: owner admin manage"
  on public.amenities for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "amenities: security member view" on public.amenities;
create policy "amenities: security member view"
  on public.amenities for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- amenity_bookings
drop policy if exists "amenity_bookings: select own or residential admin" on public.amenity_bookings;
create policy "amenity_bookings: select own or residential admin"
  on public.amenity_bookings for select
  to authenticated
  using (
    user_id = auth.uid()
    or is_platform_admin()
    or is_residential_admin(residential_id)
  );

drop policy if exists "amenity_bookings: insert self" on public.amenity_bookings;
create policy "amenity_bookings: insert self"
  on public.amenity_bookings for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and is_residential_member(residential_id)
  );

drop policy if exists "amenity_bookings: update own or admin" on public.amenity_bookings;
create policy "amenity_bookings: update own or admin"
  on public.amenity_bookings for update
  to authenticated
  using (
    user_id = auth.uid()
    or is_platform_admin()
    or is_residential_admin(residential_id)
  )
  with check (
    user_id = auth.uid()
    or is_platform_admin()
    or is_residential_admin(residential_id)
  );

drop policy if exists "amenity_bookings: delete own or admin" on public.amenity_bookings;
create policy "amenity_bookings: delete own or admin"
  on public.amenity_bookings for delete
  to authenticated
  using (
    user_id = auth.uid()
    or is_platform_admin()
    or is_residential_admin(residential_id)
  );

-- buildings
drop policy if exists "buildings: platform admin all" on public.buildings;
create policy "buildings: platform admin all"
  on public.buildings for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "buildings: owner admin manage" on public.buildings;
create policy "buildings: owner admin manage"
  on public.buildings for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "buildings: members view" on public.buildings;
create policy "buildings: members view"
  on public.buildings for select
  to authenticated
  using (is_residential_member(residential_id));

-- floors (residential via buildings)
drop policy if exists "floors: platform admin all" on public.floors;
create policy "floors: platform admin all"
  on public.floors for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "floors: owner admin manage" on public.floors;
create policy "floors: owner admin manage"
  on public.floors for all
  to authenticated
  using (
    exists (
      select 1
      from public.buildings b
      where b.id = floors.building_id
        and is_residential_admin(b.residential_id)
    )
  )
  with check (
    exists (
      select 1
      from public.buildings b
      where b.id = floors.building_id
        and is_residential_admin(b.residential_id)
    )
  );

drop policy if exists "floors: members view" on public.floors;
create policy "floors: members view"
  on public.floors for select
  to authenticated
  using (
    is_platform_admin()
    or exists (
      select 1
      from public.buildings b
      where b.id = floors.building_id
        and is_residential_member(b.residential_id)
    )
  );

-- location_types
drop policy if exists "location_types: platform admin all" on public.location_types;
create policy "location_types: platform admin all"
  on public.location_types for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "location_types: owner admin manage" on public.location_types;
create policy "location_types: owner admin manage"
  on public.location_types for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "location_types: members view" on public.location_types;
create policy "location_types: members view"
  on public.location_types for select
  to authenticated
  using (is_residential_member(residential_id));

-- locations
drop policy if exists "locations: platform admin all" on public.locations;
create policy "locations: platform admin all"
  on public.locations for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "locations: owner admin manage" on public.locations;
create policy "locations: owner admin manage"
  on public.locations for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "locations: members view" on public.locations;
create policy "locations: members view"
  on public.locations for select
  to authenticated
  using (is_residential_member(residential_id));

-- locations_backup (platform admins only)
drop policy if exists "locations_backup: platform admin select" on public.locations_backup;
create policy "locations_backup: platform admin select"
  on public.locations_backup for select
  to authenticated
  using (is_platform_admin());

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------

create or replace view public.unit_locations as
select
  u.id as unit_id,
  u.name as unit_name,
  u.residential_id,
  b.id as building_id,
  b.name as building_name,
  f.id as floor_id,
  f.name as floor_name,
  b.name || ' - ' || f.name as full_location
from public.units u
left join public.buildings b on u.building_id = b.id
left join public.floors f on u.floor_id = f.id;

create or replace view public.location_hierarchy as
with recursive location_tree as (
  select
    id,
    residential_id,
    name,
    type,
    parent_id,
    is_active,
    name as path,
    1 as level
  from public.locations
  where parent_id is null

  union all

  select
    l.id,
    l.residential_id,
    l.name,
    l.type,
    l.parent_id,
    l.is_active,
    lt.path || ' > ' || l.name as path,
    lt.level + 1 as level
  from public.locations l
  inner join location_tree lt on l.parent_id = lt.id
)
select * from location_tree
order by residential_id, path;

grant select on public.unit_locations to authenticated;
grant select on public.location_hierarchy to authenticated;

