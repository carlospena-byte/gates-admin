-- gates-admin: amenity details
-- Expands amenities from a bare name/description/capacity row into a full
-- profile: images (with a chosen primary), a per-residential "services"
-- catalog (WiFi, sillas, toallas...) that can be attached and optionally
-- featured, booking rules (days/hours/payment/duration/cleaning), multiple
-- simultaneous booking-limit rules, and free-text terms. description now
-- carries Tiptap-authored HTML instead of plain text.

-- ----------------------------------------------------------------------------
-- amenities: new scalar columns
-- ----------------------------------------------------------------------------

alter table public.amenities
  add column if not exists terms text,
  add column if not exists opening_time time,
  add column if not exists closing_time time,
  add column if not exists available_days text[] not null default '{}',
  add column if not exists requires_payment boolean not null default false,
  add column if not exists price numeric(10, 2),
  add column if not exists payment_methods text[] not null default '{}',
  add column if not exists booking_duration_minutes integer,
  add column if not exists requires_cleaning boolean not null default false,
  add column if not exists cleanup_minutes integer;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.amenity_images (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  storage_path text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- At most one primary image per amenity.
create unique index if not exists amenity_images_one_primary_idx
  on public.amenity_images(amenity_id) where is_primary;

-- Several rules can apply at once (e.g. "2 per day" and "5 per month"),
-- hence its own table rather than a couple of scalar columns.
create table if not exists public.amenity_booking_limits (
  id uuid primary key default gen_random_uuid(),
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  max_count integer not null check (max_count > 0),
  period text not null check (period in ('day', 'week', 'month')),
  created_at timestamptz not null default now()
);

-- Per-residential catalog of reusable service tags (WiFi, sillas, toallas...),
-- same shape as `charges` — mutable list, attached to amenities via the
-- junction table below rather than freeform text per amenity.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (residential_id, name)
);

create table if not exists public.amenity_services (
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_featured boolean not null default false,
  primary key (amenity_id, service_id)
);

-- ----------------------------------------------------------------------------
-- Storage bucket (private — same convention as incident-attachments)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('amenity-images', 'amenity-images', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_amenity_images_amenity_id on public.amenity_images(amenity_id);
create index if not exists idx_amenity_images_residential_id on public.amenity_images(residential_id);
create index if not exists idx_amenity_booking_limits_amenity_id on public.amenity_booking_limits(amenity_id);
create index if not exists idx_services_residential_id on public.services(residential_id);
create index if not exists idx_amenity_services_service_id on public.amenity_services(service_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists audit_amenity_images on public.amenity_images;
create trigger audit_amenity_images after insert or update or delete on public.amenity_images
for each row execute function public.log_audit_event();

drop trigger if exists audit_services on public.services;
create trigger audit_services after insert or update or delete on public.services
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.amenity_images enable row level security;
alter table public.amenity_booking_limits enable row level security;
alter table public.services enable row level security;
alter table public.amenity_services enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

-- amenity_images
drop policy if exists "amenity_images: platform admin all" on public.amenity_images;
create policy "amenity_images: platform admin all"
  on public.amenity_images for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "amenity_images: owner admin manage" on public.amenity_images;
create policy "amenity_images: owner admin manage"
  on public.amenity_images for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "amenity_images: member select" on public.amenity_images;
create policy "amenity_images: member select"
  on public.amenity_images for select
  to authenticated
  using (is_residential_member(residential_id));

-- amenity_booking_limits (scoped through the parent amenity's residential_id)
drop policy if exists "amenity_booking_limits: platform admin all" on public.amenity_booking_limits;
create policy "amenity_booking_limits: platform admin all"
  on public.amenity_booking_limits for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "amenity_booking_limits: owner admin manage" on public.amenity_booking_limits;
create policy "amenity_booking_limits: owner admin manage"
  on public.amenity_booking_limits for all
  to authenticated
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_booking_limits.amenity_id
        and is_residential_admin(a.residential_id)
    )
  )
  with check (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_booking_limits.amenity_id
        and is_residential_admin(a.residential_id)
    )
  );

drop policy if exists "amenity_booking_limits: member select" on public.amenity_booking_limits;
create policy "amenity_booking_limits: member select"
  on public.amenity_booking_limits for select
  to authenticated
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_booking_limits.amenity_id
        and is_residential_member(a.residential_id)
    )
  );

-- services
drop policy if exists "services: platform admin all" on public.services;
create policy "services: platform admin all"
  on public.services for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "services: owner admin manage" on public.services;
create policy "services: owner admin manage"
  on public.services for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "services: member select" on public.services;
create policy "services: member select"
  on public.services for select
  to authenticated
  using (is_residential_member(residential_id));

-- amenity_services (scoped through the parent amenity's residential_id)
drop policy if exists "amenity_services: platform admin all" on public.amenity_services;
create policy "amenity_services: platform admin all"
  on public.amenity_services for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "amenity_services: owner admin manage" on public.amenity_services;
create policy "amenity_services: owner admin manage"
  on public.amenity_services for all
  to authenticated
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_services.amenity_id
        and is_residential_admin(a.residential_id)
    )
  )
  with check (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_services.amenity_id
        and is_residential_admin(a.residential_id)
    )
  );

drop policy if exists "amenity_services: member select" on public.amenity_services;
create policy "amenity_services: member select"
  on public.amenity_services for select
  to authenticated
  using (
    exists (
      select 1 from public.amenities a
      where a.id = amenity_services.amenity_id
        and is_residential_member(a.residential_id)
    )
  );

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on
  public.amenity_images,
  public.amenity_booking_limits,
  public.services,
  public.amenity_services
to authenticated;

grant select, insert, update, delete on
  public.amenity_images,
  public.amenity_booking_limits,
  public.services,
  public.amenity_services
to service_role;

-- ----------------------------------------------------------------------------
-- Storage RLS — path convention "{residential_id}/{amenity_id}/{filename}",
-- same shape as incident-attachments: members can view/attach, only
-- owner/admin/platform can delete.
-- ----------------------------------------------------------------------------

drop policy if exists "amenity_images storage: platform admin all" on storage.objects;
create policy "amenity_images storage: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'amenity-images' and is_platform_admin())
  with check (bucket_id = 'amenity-images' and is_platform_admin());

drop policy if exists "amenity_images storage: member select" on storage.objects;
create policy "amenity_images storage: member select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'amenity-images'
    and is_residential_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "amenity_images storage: admin insert" on storage.objects;
create policy "amenity_images storage: admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'amenity-images'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "amenity_images storage: admin delete" on storage.objects;
create policy "amenity_images storage: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'amenity-images'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );
