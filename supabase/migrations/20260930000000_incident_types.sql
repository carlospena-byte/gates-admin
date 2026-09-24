-- gates-admin: configurable incident types with per-role visibility.
-- Replaces the free-text incidents.category column (previously hardcoded,
-- independently, in both gates-admin and gates-app) with a residential-scoped
-- incident_types catalog editable from Settings by owner/admin, matching the
-- unit_types/addon_types shape. incident_type_roles records which ADDITIONAL
-- roles (beyond owner/admin, who always have full access) can see and manage
-- every incident of that type — not just ones they reported themselves.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.incident_types (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (residential_id, name)
);

-- Roles other than owner/admin granted full select+update access to every
-- incident of this type (not just their own reports). owner/admin are never
-- stored here — they already have unconditional access via
-- is_residential_admin().
create table if not exists public.incident_type_roles (
  incident_type_id uuid not null references public.incident_types(id) on delete cascade,
  role text not null,
  primary key (incident_type_id, role)
);

alter table public.incident_type_roles
  drop constraint if exists incident_type_roles_role_check;
alter table public.incident_type_roles
  add constraint incident_type_roles_role_check check (role in ('security', 'member'));

alter table public.incidents
  add column if not exists incident_type_id uuid references public.incident_types(id) on delete set null;

create index if not exists idx_incident_types_residential_id on public.incident_types(residential_id);
create index if not exists idx_incident_type_roles_incident_type_id on public.incident_type_roles(incident_type_id);
create index if not exists idx_incidents_incident_type_id on public.incidents(incident_type_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists update_incident_types_updated_at on public.incident_types;
create trigger update_incident_types_updated_at before update on public.incident_types
for each row execute function public.update_updated_at_column();

drop trigger if exists audit_incident_types on public.incident_types;
create trigger audit_incident_types after insert or update or delete on public.incident_types
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Seed default types + backfill incidents.incident_type_id from category
-- ----------------------------------------------------------------------------

do $$
declare
  v_residential record;
  v_incident record;
  v_type_id uuid;
  v_default_names text[] := array['Mantenimiento', 'Seguridad', 'Ruido', 'Limpieza', 'Otro'];
  v_name text;
begin
  for v_residential in select id from public.residentials loop
    foreach v_name in array v_default_names loop
      insert into public.incident_types (residential_id, name)
      values (v_residential.id, v_name)
      on conflict (residential_id, name) do nothing;
    end loop;
  end loop;

  for v_incident in
    select id, residential_id, category
    from public.incidents
    where category is not null and btrim(category) <> ''
  loop
    v_type_id := null;

    select id into v_type_id
    from public.incident_types
    where residential_id = v_incident.residential_id
      and name = (
        case lower(btrim(v_incident.category))
          when 'maintenance' then 'Mantenimiento'
          when 'mantenimiento' then 'Mantenimiento'
          when 'security' then 'Seguridad'
          when 'seguridad' then 'Seguridad'
          when 'noise' then 'Ruido'
          when 'ruido' then 'Ruido'
          when 'cleanliness' then 'Limpieza'
          when 'limpieza' then 'Limpieza'
          when 'other' then 'Otro'
          when 'otro' then 'Otro'
          else null
        end
      );

    if v_type_id is null then
      -- Unrecognized legacy category: preserve it as its own custom type
      -- instead of silently collapsing it into "Otro".
      insert into public.incident_types (residential_id, name)
      values (v_incident.residential_id, btrim(v_incident.category))
      on conflict (residential_id, name) do nothing;

      select id into v_type_id
      from public.incident_types
      where residential_id = v_incident.residential_id
        and name = btrim(v_incident.category);
    end if;

    update public.incidents set incident_type_id = v_type_id where id = v_incident.id;
  end loop;
end $$;

alter table public.incidents drop column if exists category;

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.incident_types enable row level security;
alter table public.incident_type_roles enable row level security;

-- ----------------------------------------------------------------------------
-- Policies: incident_types (same pattern as unit_types/addon_types)
-- ----------------------------------------------------------------------------

drop policy if exists "incident_types: platform admin all" on public.incident_types;
create policy "incident_types: platform admin all"
  on public.incident_types for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "incident_types: owner admin manage" on public.incident_types;
create policy "incident_types: owner admin manage"
  on public.incident_types for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "incident_types: members view" on public.incident_types;
create policy "incident_types: members view"
  on public.incident_types for select
  to authenticated
  using (is_residential_member(residential_id));

-- ----------------------------------------------------------------------------
-- Policies: incident_type_roles (scoped via the parent incident_type's
-- residential_id, same join-through-parent pattern as unit_addons -> units).
-- Select is open to any residential member so the "incidents: type role
-- select/update" policies below can evaluate this table in a subquery
-- regardless of the querying user's own role.
-- ----------------------------------------------------------------------------

drop policy if exists "incident_type_roles: platform admin all" on public.incident_type_roles;
create policy "incident_type_roles: platform admin all"
  on public.incident_type_roles for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "incident_type_roles: owner admin manage" on public.incident_type_roles;
create policy "incident_type_roles: owner admin manage"
  on public.incident_type_roles for all
  to authenticated
  using (
    exists (
      select 1 from public.incident_types it
      where it.id = incident_type_roles.incident_type_id
        and is_residential_admin(it.residential_id)
    )
  )
  with check (
    exists (
      select 1 from public.incident_types it
      where it.id = incident_type_roles.incident_type_id
        and is_residential_admin(it.residential_id)
    )
  );

drop policy if exists "incident_type_roles: members view" on public.incident_type_roles;
create policy "incident_type_roles: members view"
  on public.incident_type_roles for select
  to authenticated
  using (
    exists (
      select 1 from public.incident_types it
      where it.id = incident_type_roles.incident_type_id
        and is_residential_member(it.residential_id)
    )
  );

-- ----------------------------------------------------------------------------
-- Policies: incidents — additive select/update access for roles granted
-- visibility on the incident's type, on top of the existing "own reports
-- only" policies from 20260929000000_incidents_own_reports_only.sql.
-- Permissive policies for the same command are combined with OR, so this
-- only ever widens access, never narrows it.
-- ----------------------------------------------------------------------------

drop policy if exists "incidents: type role select" on public.incidents;
create policy "incidents: type role select"
  on public.incidents for select
  to authenticated
  using (
    exists (
      select 1 from public.incident_type_roles itr
      join public.residential_users ru
        on ru.residential_id = incidents.residential_id and ru.user_id = auth.uid()
      where itr.incident_type_id = incidents.incident_type_id
        and itr.role = ru.role
    )
  );

drop policy if exists "incidents: type role update" on public.incidents;
create policy "incidents: type role update"
  on public.incidents for update
  to authenticated
  using (
    exists (
      select 1 from public.incident_type_roles itr
      join public.residential_users ru
        on ru.residential_id = incidents.residential_id and ru.user_id = auth.uid()
      where itr.incident_type_id = incidents.incident_type_id
        and itr.role = ru.role
    )
  )
  with check (
    exists (
      select 1 from public.incident_type_roles itr
      join public.residential_users ru
        on ru.residential_id = incidents.residential_id and ru.user_id = auth.uid()
      where itr.incident_type_id = incidents.incident_type_id
        and itr.role = ru.role
    )
  );

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.incident_types to authenticated;
grant select, insert, update, delete on public.incident_type_roles to authenticated;

grant select, insert, update, delete on
  public.incident_types,
  public.incident_type_roles
to service_role;
