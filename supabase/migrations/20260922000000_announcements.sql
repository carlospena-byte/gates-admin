-- gates-admin: announcements
-- "Scheduling" a publish is just status='published' with a future
-- publish_at — the non-admin select policy requires publish_at <= now(),
-- so it becomes visible on its own once that time passes, no cron/Edge
-- Function needed. Admins always see everything regardless of status/time
-- so they can manage drafts and not-yet-live posts.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  title text not null,
  content text,
  category text,
  audience text not null default 'everyone',
  status text not null default 'draft',
  publish_at timestamptz,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements drop constraint if exists announcements_audience_check;
alter table public.announcements
  add constraint announcements_audience_check check (audience in ('everyone', 'admins'));

alter table public.announcements drop constraint if exists announcements_status_check;
alter table public.announcements
  add constraint announcements_status_check check (status in ('draft', 'published'));

-- Read-tracking data model, left in place for a future resident-facing
-- consumer (per the audit's own "leave room for this, don't build the UI
-- yet" note) — no read-tracking screen is built in this pass.
create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_announcements_residential_id on public.announcements(residential_id);
create index if not exists idx_announcements_status on public.announcements(status);
create index if not exists idx_announcement_reads_user_id on public.announcement_reads(user_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists update_announcements_updated_at on public.announcements;
create trigger update_announcements_updated_at before update on public.announcements
for each row execute function public.update_updated_at_column();

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

drop policy if exists "announcements: platform admin all" on public.announcements;
create policy "announcements: platform admin all"
  on public.announcements for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "announcements: owner admin manage" on public.announcements;
create policy "announcements: owner admin manage"
  on public.announcements for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

-- Non-admins only ever see published, time-elapsed posts matching their
-- audience — 'everyone' for any member, 'admins' only for admins (who
-- already see everything via the policy above regardless).
drop policy if exists "announcements: members view published" on public.announcements;
create policy "announcements: members view published"
  on public.announcements for select
  to authenticated
  using (
    status = 'published'
    and (publish_at is null or publish_at <= now())
    and audience = 'everyone'
    and is_residential_member(residential_id)
  );

-- announcement_reads: insert/select own only — no admin read-receipts UI
-- in this pass, so no broader admin policy is needed yet.
drop policy if exists "announcement_reads: self manage" on public.announcement_reads;
create policy "announcement_reads: self manage"
  on public.announcement_reads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.announcement_reads to authenticated;

grant select, insert, update, delete on
  public.announcements,
  public.announcement_reads
to service_role;
