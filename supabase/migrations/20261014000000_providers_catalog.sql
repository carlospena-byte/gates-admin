-- gates-admin: providers catalog
--
-- Delivery/Proveedor/Paquetería exists today only as `provider_kind`, a
-- fixed enum on `visitors` — the actual company/courier name is free text
-- typed into `visitors.name` every time, with no reuse. This adds a real
-- catalog, one table with a `kind` column (not three separate catalogs —
-- all three share the same shape: name/phone/active), mirroring the
-- existing `services` catalog exactly: residential_id null = platform-wide
-- row managed by platform admins, non-null = a residential's own extra.

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid references public.residentials(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('proveedor', 'delivery', 'paqueteria')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists providers_global_name_idx
  on public.providers(name) where residential_id is null;
create unique index if not exists providers_residential_name_idx
  on public.providers(residential_id, name) where residential_id is not null;

create index if not exists idx_providers_residential_id on public.providers(residential_id);

alter table public.providers enable row level security;

drop policy if exists "providers: platform admin all" on public.providers;
create policy "providers: platform admin all"
  on public.providers for all to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "providers: owner admin manage" on public.providers;
create policy "providers: owner admin manage"
  on public.providers for all to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "providers: member select" on public.providers;
create policy "providers: member select"
  on public.providers for select to authenticated
  using (residential_id is null or is_residential_member(residential_id));

grant select, insert, update, delete on public.providers to authenticated;

drop trigger if exists audit_providers on public.providers;
create trigger audit_providers after insert or update or delete on public.providers
for each row execute function public.log_audit_event();
