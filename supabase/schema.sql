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

-- Generic audit trail: attached as an AFTER INSERT/UPDATE/DELETE trigger on
-- every mutable table. SECURITY DEFINER so it can write to audit_logs even
-- though ordinary users have no insert/update/delete grant on that table —
-- the log is meant to be tamper-proof from the app's point of view.
-- residential_id is read straight off the row when the table has that
-- column; unit_addons needs a join to find it.
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb := to_jsonb(coalesce(NEW, OLD));
  v_residential_id uuid := (to_jsonb(coalesce(NEW, OLD))->>'residential_id')::uuid;
  v_record_id uuid := coalesce(
    (v_row->>'id')::uuid,
    (v_row->>'user_id')::uuid
  );
begin
  if v_residential_id is null then
    if TG_TABLE_NAME = 'unit_addons' then
      select u.residential_id into v_residential_id
      from public.units u
      where u.id = (v_row->>'unit_id')::uuid;
    end if;
  end if;

  insert into public.audit_logs (residential_id, table_name, record_id, action, actor_user_id, old_data, new_data)
  values (
    v_residential_id,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    auth.uid(),
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end
  );

  return coalesce(NEW, OLD);
end;
$$;

alter function public.log_audit_event() owner to postgres;

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

-- Dynamic location types + hierarchical locations
create table if not exists public.location_types (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  code text not null,
  -- Hierarchy depth: 1 = top level (e.g. Edificio/Bloque), 2 = next level
  -- down (e.g. Piso/Polígono), etc. Drives which types can be picked as a
  -- location's parent when creating/editing (parent.level = level - 1).
  level integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, code)
);

alter table public.location_types
  drop constraint if exists location_types_level_check;
alter table public.location_types
  add constraint location_types_level_check check (level >= 1);

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

-- Individual, physical instances of an addon (e.g. addon "Parqueo" has
-- addon_items "P1 101", "P1 102"...), each optionally placed at a point in
-- the location hierarchy (Torre A -> Piso 1). unit_addons links a unit to
-- one of these specific items, not to the addon category itself.
-- No unique constraint on (addon_id, name): two items can share a name (e.g.
-- the same spot number reused across different towers/floors) — the app
-- warns on a duplicate name within the same addon but still allows it.
create table if not exists public.addon_items (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  addon_id uuid not null references public.addons(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  name text not null,
  -- Informational reference price for this specific item (e.g. this parking
  -- spot costs more than others) — independent of any rental.
  price numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  location_id uuid references public.locations(id) on delete set null,
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  -- Informational reference price (e.g. asking rent) — independent of
  -- whether the unit currently has an active rental (see unit_rentals).
  price numeric(12,2),
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
  addon_item_id uuid not null references public.addon_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (unit_id, addon_item_id)
);

-- People authorized to be in a unit. Contact info only — unlike
-- unit_members, this doesn't require the person to already have an
-- auth.users/profiles account.
create table if not exists public.unit_residents (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A unit can have many rental periods over time: a single ongoing 'monthly'
-- tenancy (the person responsible for the unit, whether a long-term renter
-- or the owner living there) and/or any number of 'short_term' stays
-- (Airbnb-style guests). The tenant/guest is contact info only, like
-- unit_residents — not tied to a registered app account.
create table if not exists public.unit_rentals (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  rental_type text not null default 'monthly',
  tenant_name text not null,
  tenant_email text,
  tenant_phone text,
  start_date date not null,
  end_date date,
  price numeric(12,2),
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unit_rentals drop constraint if exists unit_rentals_rental_type_check;
alter table public.unit_rentals
  add constraint unit_rentals_rental_type_check check (rental_type in ('monthly', 'short_term'));

alter table public.unit_rentals drop constraint if exists unit_rentals_status_check;
alter table public.unit_rentals
  add constraint unit_rentals_status_check check (status in ('pending', 'active', 'completed', 'cancelled'));

-- Payments owed against a rental — one row per installment. A short_term
-- rental typically has a single row; a monthly rental gets one per period.
create table if not exists public.unit_rental_payments (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  rental_id uuid not null references public.unit_rentals(id) on delete cascade,
  amount numeric(12,2) not null,
  due_date date not null,
  paid_at timestamptz,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unit_rental_payments drop constraint if exists unit_rental_payments_status_check;
alter table public.unit_rental_payments
  add constraint unit_rental_payments_status_check check (status in ('pending', 'paid', 'overdue', 'cancelled'));

-- Recurring/permanent extra charges (e.g. "Seguridad", "Mantenimiento y
-- Limpieza") — deliberately separate from addons/addon_items, which model
-- physical, location-bound things (parking spots, storage units). A charge
-- has no price of its own; the price lives on each unit's assignment
-- (unit_charges), so the same charge can cost different amounts for
-- different units/towers. Does not affect units.price.
create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.unit_charges (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  price numeric(12,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (charge_id, unit_id)
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

-- Audit trail (see log_audit_event() above). residential_id is set to null
-- when a mutation can't be tied to one (e.g. platform_admins, profiles).
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid references public.residentials(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Triggers / indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_units_residential_id on public.units(residential_id);
create index if not exists idx_units_owner_user_id on public.units(owner_user_id);
create index if not exists idx_units_unit_type_id on public.units(unit_type_id);

create index if not exists idx_unit_types_residential_id on public.unit_types(residential_id);
create index if not exists idx_addon_types_residential_id on public.addon_types(residential_id);
create index if not exists idx_addons_residential_id on public.addons(residential_id);
create index if not exists idx_addons_addon_type_id on public.addons(addon_type_id);
create index if not exists idx_addon_items_residential_id on public.addon_items(residential_id);
create index if not exists idx_addon_items_addon_id on public.addon_items(addon_id);
create index if not exists idx_addon_items_location_id on public.addon_items(location_id);
create index if not exists idx_unit_addons_unit_id on public.unit_addons(unit_id);
create index if not exists idx_unit_addons_addon_item_id on public.unit_addons(addon_item_id);
create index if not exists idx_unit_residents_unit_id on public.unit_residents(unit_id);
create index if not exists idx_unit_residents_residential_id on public.unit_residents(residential_id);
create index if not exists idx_unit_rentals_unit_id on public.unit_rentals(unit_id);
create index if not exists idx_unit_rentals_residential_id on public.unit_rentals(residential_id);
create index if not exists idx_unit_rental_payments_rental_id on public.unit_rental_payments(rental_id);
create index if not exists idx_unit_rental_payments_residential_id on public.unit_rental_payments(residential_id);
create index if not exists idx_charges_residential_id on public.charges(residential_id);
create index if not exists idx_unit_charges_residential_id on public.unit_charges(residential_id);
create index if not exists idx_unit_charges_charge_id on public.unit_charges(charge_id);
create index if not exists idx_unit_charges_unit_id on public.unit_charges(unit_id);
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

drop trigger if exists update_addon_items_updated_at on public.addon_items;
create trigger update_addon_items_updated_at before update on public.addon_items
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

drop trigger if exists update_unit_residents_updated_at on public.unit_residents;
create trigger update_unit_residents_updated_at before update on public.unit_residents
for each row execute function public.update_updated_at_column();

drop trigger if exists update_unit_rentals_updated_at on public.unit_rentals;
create trigger update_unit_rentals_updated_at before update on public.unit_rentals
for each row execute function public.update_updated_at_column();

drop trigger if exists update_unit_rental_payments_updated_at on public.unit_rental_payments;
create trigger update_unit_rental_payments_updated_at before update on public.unit_rental_payments
for each row execute function public.update_updated_at_column();

drop trigger if exists update_charges_updated_at on public.charges;
create trigger update_charges_updated_at before update on public.charges
for each row execute function public.update_updated_at_column();

drop trigger if exists update_unit_charges_updated_at on public.unit_charges;
create trigger update_unit_charges_updated_at before update on public.unit_charges
for each row execute function public.update_updated_at_column();

-- Audit trail: one AFTER trigger per mutable table (log_audit_event() above).
-- locations_backup is excluded — it has no insert/update/delete policy at
-- all, so it can never be mutated through the app in the first place.
create index if not exists idx_audit_logs_residential_id on public.audit_logs(residential_id);
create index if not exists idx_audit_logs_table_name on public.audit_logs(table_name);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
for each row execute function public.log_audit_event();

drop trigger if exists audit_platform_admins on public.platform_admins;
create trigger audit_platform_admins after insert or update or delete on public.platform_admins
for each row execute function public.log_audit_event();

drop trigger if exists audit_residentials on public.residentials;
create trigger audit_residentials after insert or update or delete on public.residentials
for each row execute function public.log_audit_event();

drop trigger if exists audit_residential_users on public.residential_users;
create trigger audit_residential_users after insert or update or delete on public.residential_users
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_types on public.unit_types;
create trigger audit_unit_types after insert or update or delete on public.unit_types
for each row execute function public.log_audit_event();

drop trigger if exists audit_addon_types on public.addon_types;
create trigger audit_addon_types after insert or update or delete on public.addon_types
for each row execute function public.log_audit_event();

drop trigger if exists audit_addons on public.addons;
create trigger audit_addons after insert or update or delete on public.addons
for each row execute function public.log_audit_event();

drop trigger if exists audit_addon_items on public.addon_items;
create trigger audit_addon_items after insert or update or delete on public.addon_items
for each row execute function public.log_audit_event();

drop trigger if exists audit_location_types on public.location_types;
create trigger audit_location_types after insert or update or delete on public.location_types
for each row execute function public.log_audit_event();

drop trigger if exists audit_locations on public.locations;
create trigger audit_locations after insert or update or delete on public.locations
for each row execute function public.log_audit_event();

drop trigger if exists audit_units on public.units;
create trigger audit_units after insert or update or delete on public.units
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_members on public.unit_members;
create trigger audit_unit_members after insert or update or delete on public.unit_members
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_addons on public.unit_addons;
create trigger audit_unit_addons after insert or update or delete on public.unit_addons
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_residents on public.unit_residents;
create trigger audit_unit_residents after insert or update or delete on public.unit_residents
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_rentals on public.unit_rentals;
create trigger audit_unit_rentals after insert or update or delete on public.unit_rentals
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_rental_payments on public.unit_rental_payments;
create trigger audit_unit_rental_payments after insert or update or delete on public.unit_rental_payments
for each row execute function public.log_audit_event();

drop trigger if exists audit_charges on public.charges;
create trigger audit_charges after insert or update or delete on public.charges
for each row execute function public.log_audit_event();

drop trigger if exists audit_unit_charges on public.unit_charges;
create trigger audit_unit_charges after insert or update or delete on public.unit_charges
for each row execute function public.log_audit_event();

drop trigger if exists audit_amenities on public.amenities;
create trigger audit_amenities after insert or update or delete on public.amenities
for each row execute function public.log_audit_event();

drop trigger if exists audit_amenity_bookings on public.amenity_bookings;
create trigger audit_amenity_bookings after insert or update or delete on public.amenity_bookings
for each row execute function public.log_audit_event();

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
alter table public.addon_items enable row level security;
alter table public.unit_addons enable row level security;
alter table public.unit_residents enable row level security;
alter table public.unit_rentals enable row level security;
alter table public.unit_rental_payments enable row level security;
alter table public.charges enable row level security;
alter table public.unit_charges enable row level security;
alter table public.amenities enable row level security;
alter table public.amenity_bookings enable row level security;
alter table public.location_types enable row level security;
alter table public.locations enable row level security;
alter table public.locations_backup enable row level security;
alter table public.audit_logs enable row level security;

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

-- unit_residents
drop policy if exists "unit_residents: platform admin all" on public.unit_residents;
create policy "unit_residents: platform admin all"
  on public.unit_residents for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_residents: owner admin manage" on public.unit_residents;
create policy "unit_residents: owner admin manage"
  on public.unit_residents for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_residents: members view" on public.unit_residents;
create policy "unit_residents: members view"
  on public.unit_residents for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- unit_rentals
drop policy if exists "unit_rentals: platform admin all" on public.unit_rentals;
create policy "unit_rentals: platform admin all"
  on public.unit_rentals for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_rentals: owner admin manage" on public.unit_rentals;
create policy "unit_rentals: owner admin manage"
  on public.unit_rentals for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_rentals: members view" on public.unit_rentals;
create policy "unit_rentals: members view"
  on public.unit_rentals for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- unit_rental_payments
drop policy if exists "unit_rental_payments: platform admin all" on public.unit_rental_payments;
create policy "unit_rental_payments: platform admin all"
  on public.unit_rental_payments for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_rental_payments: owner admin manage" on public.unit_rental_payments;
create policy "unit_rental_payments: owner admin manage"
  on public.unit_rental_payments for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_rental_payments: members view" on public.unit_rental_payments;
create policy "unit_rental_payments: members view"
  on public.unit_rental_payments for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- charges
drop policy if exists "charges: platform admin all" on public.charges;
create policy "charges: platform admin all"
  on public.charges for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "charges: owner admin manage" on public.charges;
create policy "charges: owner admin manage"
  on public.charges for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "charges: members view" on public.charges;
create policy "charges: members view"
  on public.charges for select
  to authenticated
  using (is_platform_admin() or is_residential_member(residential_id));

-- unit_charges
drop policy if exists "unit_charges: platform admin all" on public.unit_charges;
create policy "unit_charges: platform admin all"
  on public.unit_charges for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "unit_charges: owner admin manage" on public.unit_charges;
create policy "unit_charges: owner admin manage"
  on public.unit_charges for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "unit_charges: members view" on public.unit_charges;
create policy "unit_charges: members view"
  on public.unit_charges for select
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

-- addon_items
drop policy if exists "addon_items: platform admin all" on public.addon_items;
create policy "addon_items: platform admin all"
  on public.addon_items for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "addon_items: owner admin manage" on public.addon_items;
create policy "addon_items: owner admin manage"
  on public.addon_items for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "addon_items: members view" on public.addon_items;
create policy "addon_items: members view"
  on public.addon_items for select
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

-- audit_logs (read-only: owners/admins see their residential's trail, platform
-- admins see everything; nobody gets an insert/update/delete policy, so only
-- the SECURITY DEFINER log_audit_event() trigger can ever write a row)
drop policy if exists "audit_logs: platform admin select" on public.audit_logs;
create policy "audit_logs: platform admin select"
  on public.audit_logs for select
  to authenticated
  using (is_platform_admin());

drop policy if exists "audit_logs: residential admin select" on public.audit_logs;
create policy "audit_logs: residential admin select"
  on public.audit_logs for select
  to authenticated
  using (residential_id is not null and is_residential_admin(residential_id));

-- ----------------------------------------------------------------------------
-- Table grants
-- RLS policies above control row-level access, but Postgres also requires
-- the base table privilege before a policy is even evaluated.
-- ----------------------------------------------------------------------------

grant select on public.platform_admins to authenticated;
grant select on public.locations_backup to authenticated;
-- audit_logs: select only — rows are written exclusively by the SECURITY
-- DEFINER log_audit_event() trigger, never by an app-level insert/update.
grant select on public.audit_logs to authenticated;

grant select, insert, update on public.residentials to authenticated;
grant select, insert, update on public.profiles to authenticated;

grant select, insert, update, delete on public.residential_users to authenticated;
grant select, insert, update, delete on public.location_types to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.units to authenticated;
grant select, insert, update, delete on public.unit_types to authenticated;
grant select, insert, update, delete on public.unit_members to authenticated;
grant select, insert, update, delete on public.unit_addons to authenticated;
grant select, insert, update, delete on public.unit_residents to authenticated;
grant select, insert, update, delete on public.unit_rentals to authenticated;
grant select, insert, update, delete on public.unit_rental_payments to authenticated;
grant select, insert, update, delete on public.charges to authenticated;
grant select, insert, update, delete on public.unit_charges to authenticated;
grant select, insert, update, delete on public.addons to authenticated;
grant select, insert, update, delete on public.addon_items to authenticated;
grant select, insert, update, delete on public.addon_types to authenticated;
grant select, insert, update, delete on public.amenities to authenticated;
grant select, insert, update, delete on public.amenity_bookings to authenticated;

-- service_role bypasses RLS but, like authenticated, still needs the base
-- table privilege — grant it full access across the board.
grant select, insert, update, delete on
  public.platform_admins,
  public.locations_backup,
  public.residentials,
  public.profiles,
  public.residential_users,
  public.location_types,
  public.locations,
  public.units,
  public.unit_types,
  public.unit_members,
  public.unit_addons,
  public.unit_residents,
  public.unit_rentals,
  public.unit_rental_payments,
  public.charges,
  public.unit_charges,
  public.addons,
  public.addon_items,
  public.addon_types,
  public.amenities,
  public.amenity_bookings,
  public.audit_logs
to service_role;

-- ----------------------------------------------------------------------------
-- Views
-- ----------------------------------------------------------------------------

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

grant select on public.location_hierarchy to authenticated, service_role;

