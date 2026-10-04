-- gates-admin: bulletins (boletines)
-- A residential admin writes a bulletin (title + rich-text description +
-- images + PDFs) and publishes it; residents read the published ones from
-- the mobile app and can be pushed a notification that deep-links to it.
-- Separate from `announcements`: those are plain-text admin posts with an
-- audience/scheduling model; bulletins carry attachments and have a
-- resident-facing history screen.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  title text not null,
  -- Sanitized-on-render HTML from the admin's rich text editor (a small
  -- subset: p, strong, em, ul/ol/li, a). The mobile app renders it with
  -- flutter_html, which never executes scripts.
  description text,
  status text not null default 'draft',
  published_at timestamptz,
  -- Set by the send-bulletin-notification edge function the first time a
  -- push goes out, so unpublish/republish never notifies residents twice.
  notified_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bulletins drop constraint if exists bulletins_status_check;
alter table public.bulletins
  add constraint bulletins_status_check check (status in ('draft', 'published'));

-- Images and PDFs live in one table (kind tells them apart) so a bulletin
-- has a single ordered attachment list.
create table if not exists public.bulletin_attachments (
  id uuid primary key default gen_random_uuid(),
  bulletin_id uuid not null references public.bulletins(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  kind text not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.bulletin_attachments drop constraint if exists bulletin_attachments_kind_check;
alter table public.bulletin_attachments
  add constraint bulletin_attachments_kind_check check (kind in ('image', 'pdf'));

-- ----------------------------------------------------------------------------
-- Storage bucket (private; read through short-lived signed URLs)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bulletin-attachments',
  'bulletin-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_bulletins_residential_published
  on public.bulletins(residential_id, published_at desc);
create index if not exists idx_bulletin_attachments_bulletin_id
  on public.bulletin_attachments(bulletin_id);
create index if not exists idx_bulletin_attachments_residential_id
  on public.bulletin_attachments(residential_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists update_bulletins_updated_at on public.bulletins;
create trigger update_bulletins_updated_at before update on public.bulletins
for each row execute function public.update_updated_at_column();

-- First transition to 'published' stamps published_at; the history screen
-- sorts by it, so editing a published bulletin never reorders it.
create or replace function public.set_bulletin_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_bulletins_published_at on public.bulletins;
create trigger set_bulletins_published_at before insert or update on public.bulletins
for each row execute function public.set_bulletin_published_at();

drop trigger if exists audit_bulletins on public.bulletins;
create trigger audit_bulletins after insert or update or delete on public.bulletins
for each row execute function public.log_audit_event();

drop trigger if exists audit_bulletin_attachments on public.bulletin_attachments;
create trigger audit_bulletin_attachments after insert or update or delete on public.bulletin_attachments
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.bulletins enable row level security;
alter table public.bulletin_attachments enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

drop policy if exists "bulletins: platform admin all" on public.bulletins;
create policy "bulletins: platform admin all"
  on public.bulletins for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "bulletins: owner admin manage" on public.bulletins;
create policy "bulletins: owner admin manage"
  on public.bulletins for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

-- Residents (and security) only ever see published bulletins.
drop policy if exists "bulletins: members view published" on public.bulletins;
create policy "bulletins: members view published"
  on public.bulletins for select
  to authenticated
  using (status = 'published' and is_residential_member(residential_id));

drop policy if exists "bulletin_attachments: platform admin all" on public.bulletin_attachments;
create policy "bulletin_attachments: platform admin all"
  on public.bulletin_attachments for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "bulletin_attachments: owner admin manage" on public.bulletin_attachments;
create policy "bulletin_attachments: owner admin manage"
  on public.bulletin_attachments for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "bulletin_attachments: members view published" on public.bulletin_attachments;
create policy "bulletin_attachments: members view published"
  on public.bulletin_attachments for select
  to authenticated
  using (
    is_residential_member(residential_id)
    and exists (
      select 1 from public.bulletins b
      where b.id = bulletin_id and b.status = 'published'
    )
  );

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on
  public.bulletins,
  public.bulletin_attachments
to authenticated;

grant select, insert, update, delete on
  public.bulletins,
  public.bulletin_attachments
to service_role;

-- ----------------------------------------------------------------------------
-- Storage RLS — path convention "{residential_id}/{bulletin_id}/{file}".
-- Members can read (the attachments table already hides drafts, and paths
-- are unguessable); only owner/admin/platform can write or delete.
-- ----------------------------------------------------------------------------

drop policy if exists "bulletin_attachments storage: platform admin all" on storage.objects;
create policy "bulletin_attachments storage: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'bulletin-attachments' and is_platform_admin())
  with check (bucket_id = 'bulletin-attachments' and is_platform_admin());

drop policy if exists "bulletin_attachments storage: member select" on storage.objects;
create policy "bulletin_attachments storage: member select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bulletin-attachments'
    and is_residential_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "bulletin_attachments storage: admin insert" on storage.objects;
create policy "bulletin_attachments storage: admin insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bulletin-attachments'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "bulletin_attachments storage: admin delete" on storage.objects;
create policy "bulletin_attachments storage: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bulletin-attachments'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );
