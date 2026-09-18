-- gates-admin: visitors, vehicles, access_logs
-- Adds visitor/gate access-control tables. is_residential_security() has
-- existed since the baseline but no policy referenced it until now — this
-- migration is what actually gives the "security" role something to do.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  resident_id uuid references public.unit_residents(id) on delete set null,
  plate text not null,
  brand text,
  model text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Someone who may be on-site for a bounded window: a delivery, guest,
-- contractor, etc. unit_id is nullable (e.g. a visitor for common areas /
-- not yet assigned to a specific unit). access_code is optional — a guard
-- can also just look the visitor up by name/plate at the gate.
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  invited_by uuid references public.profiles(user_id) on delete set null,
  name text not null,
  phone text,
  plate text,
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  access_code text,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.visitors drop constraint if exists visitors_status_check;
alter table public.visitors
  add constraint visitors_status_check
  check (status in ('scheduled', 'active', 'inside', 'completed', 'cancelled', 'rejected'));

-- Physical entry/exit bitácora, separate from the visitor row itself so a
-- visitor can be checked in/out more than once without losing history.
-- No gates/access_points catalog table for MVP — gate_name is free text.
create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  gate_name text,
  checked_in_by uuid references public.profiles(user_id) on delete set null,
  checked_in_at timestamptz,
  checked_out_by uuid references public.profiles(user_id) on delete set null,
  checked_out_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_vehicles_residential_id on public.vehicles(residential_id);
create index if not exists idx_vehicles_unit_id on public.vehicles(unit_id);
create index if not exists idx_vehicles_plate on public.vehicles(plate);

create index if not exists idx_visitors_residential_id on public.visitors(residential_id);
create index if not exists idx_visitors_unit_id on public.visitors(unit_id);
create index if not exists idx_visitors_status on public.visitors(status);
create index if not exists idx_visitors_valid_from on public.visitors(valid_from);

create index if not exists idx_access_logs_residential_id on public.access_logs(residential_id);
create index if not exists idx_access_logs_visitor_id on public.access_logs(visitor_id);
create index if not exists idx_access_logs_checked_in_at on public.access_logs(checked_in_at desc);

-- residential_users has no index on user_id alone (its PK is the composite
-- (residential_id, user_id)), yet useAccess() looks it up by user_id on
-- every login — cheap, high-value fix bundled in with this migration.
create index if not exists idx_residential_users_user_id on public.residential_users(user_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists update_vehicles_updated_at on public.vehicles;
create trigger update_vehicles_updated_at before update on public.vehicles
for each row execute function public.update_updated_at_column();

drop trigger if exists update_visitors_updated_at on public.visitors;
create trigger update_visitors_updated_at before update on public.visitors
for each row execute function public.update_updated_at_column();

-- access_logs has no updated_at column (it's inserted once at check-in, then
-- updated once at check-out) — no updated_at trigger needed.

drop trigger if exists audit_vehicles on public.vehicles;
create trigger audit_vehicles after insert or update or delete on public.vehicles
for each row execute function public.log_audit_event();

drop trigger if exists audit_visitors on public.visitors;
create trigger audit_visitors after insert or update or delete on public.visitors
for each row execute function public.log_audit_event();

drop trigger if exists audit_access_logs on public.access_logs;
create trigger audit_access_logs after insert or update or delete on public.access_logs
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.vehicles enable row level security;
alter table public.visitors enable row level security;
alter table public.access_logs enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

-- vehicles
drop policy if exists "vehicles: platform admin all" on public.vehicles;
create policy "vehicles: platform admin all"
  on public.vehicles for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "vehicles: owner admin manage" on public.vehicles;
create policy "vehicles: owner admin manage"
  on public.vehicles for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

-- A guard needs to verify a plate at the gate, not edit the registry.
drop policy if exists "vehicles: security view" on public.vehicles;
create policy "vehicles: security view"
  on public.vehicles for select
  to authenticated
  using (is_residential_security(residential_id));

drop policy if exists "vehicles: members view" on public.vehicles;
create policy "vehicles: members view"
  on public.vehicles for select
  to authenticated
  using (is_residential_member(residential_id));

-- visitors
drop policy if exists "visitors: platform admin all" on public.visitors;
create policy "visitors: platform admin all"
  on public.visitors for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "visitors: owner admin manage" on public.visitors;
create policy "visitors: owner admin manage"
  on public.visitors for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "visitors: security view" on public.visitors;
create policy "visitors: security view"
  on public.visitors for select
  to authenticated
  using (is_residential_security(residential_id));

-- Security can flip status (check-in/out) without needing full admin rights
-- to create/reschedule/cancel a visit.
drop policy if exists "visitors: security update status" on public.visitors;
create policy "visitors: security update status"
  on public.visitors for update
  to authenticated
  using (is_residential_security(residential_id))
  with check (is_residential_security(residential_id));

drop policy if exists "visitors: members view" on public.visitors;
create policy "visitors: members view"
  on public.visitors for select
  to authenticated
  using (is_residential_member(residential_id));

-- access_logs (no delete policy for security: it's a bitácora, not
-- something a guard should be able to erase — only admins/platform can)
drop policy if exists "access_logs: platform admin all" on public.access_logs;
create policy "access_logs: platform admin all"
  on public.access_logs for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "access_logs: owner admin manage" on public.access_logs;
create policy "access_logs: owner admin manage"
  on public.access_logs for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "access_logs: security select" on public.access_logs;
create policy "access_logs: security select"
  on public.access_logs for select
  to authenticated
  using (is_residential_security(residential_id));

drop policy if exists "access_logs: security insert" on public.access_logs;
create policy "access_logs: security insert"
  on public.access_logs for insert
  to authenticated
  with check (is_residential_security(residential_id));

drop policy if exists "access_logs: security update" on public.access_logs;
create policy "access_logs: security update"
  on public.access_logs for update
  to authenticated
  using (is_residential_security(residential_id))
  with check (is_residential_security(residential_id));

-- ----------------------------------------------------------------------------
-- Table grants
-- RLS policies above control row-level access, but Postgres also requires
-- the base table privilege before a policy is even evaluated.
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.visitors to authenticated;
grant select, insert, update, delete on public.access_logs to authenticated;

grant select, insert, update, delete on
  public.vehicles,
  public.visitors,
  public.access_logs
to service_role;
