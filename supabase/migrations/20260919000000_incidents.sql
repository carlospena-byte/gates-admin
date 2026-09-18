-- gates-admin: incidents
-- Adds an incident-reporting inbox. Unlike visitors/payments, any logged-in
-- residential user (owner/admin/security/member) can report one — only
-- owner/admin can assign, resolve, close, or delete. Attachments live in
-- their own table + private bucket, same split as visitors/access_logs.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  reported_by uuid references public.profiles(user_id) on delete set null,
  category text,
  title text not null,
  description text,
  location text,
  priority text not null default 'medium',
  status text not null default 'new',
  assigned_to uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.incidents drop constraint if exists incidents_priority_check;
alter table public.incidents
  add constraint incidents_priority_check check (priority in ('low', 'medium', 'high', 'urgent'));

alter table public.incidents drop constraint if exists incidents_status_check;
alter table public.incidents
  add constraint incidents_status_check check (status in ('new', 'in_progress', 'resolved', 'closed'));

-- Kept separate from incidents so the parent row doesn't get overloaded
-- with attachment bookkeeping, matching the visitors/access_logs split.
create table if not exists public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  residential_id uuid not null references public.residentials(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Storage bucket (private — same convention as payment-proofs)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('incident-attachments', 'incident-attachments', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

create index if not exists idx_incidents_residential_id on public.incidents(residential_id);
create index if not exists idx_incidents_unit_id on public.incidents(unit_id);
create index if not exists idx_incidents_status on public.incidents(status);
create index if not exists idx_incidents_assigned_to on public.incidents(assigned_to);

create index if not exists idx_incident_attachments_incident_id on public.incident_attachments(incident_id);
create index if not exists idx_incident_attachments_residential_id on public.incident_attachments(residential_id);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

drop trigger if exists update_incidents_updated_at on public.incidents;
create trigger update_incidents_updated_at before update on public.incidents
for each row execute function public.update_updated_at_column();

-- The audit trigger below is what gives incidents a change history/timeline
-- without a bespoke comments/timeline table — every status/assignee change
-- lands in audit_logs automatically, same as every other table.
drop trigger if exists audit_incidents on public.incidents;
create trigger audit_incidents after insert or update or delete on public.incidents
for each row execute function public.log_audit_event();

drop trigger if exists audit_incident_attachments on public.incident_attachments;
create trigger audit_incident_attachments after insert or update or delete on public.incident_attachments
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- Enable RLS
-- ----------------------------------------------------------------------------

alter table public.incidents enable row level security;
alter table public.incident_attachments enable row level security;

-- ----------------------------------------------------------------------------
-- Policies
-- ----------------------------------------------------------------------------

-- incidents
drop policy if exists "incidents: platform admin all" on public.incidents;
create policy "incidents: platform admin all"
  on public.incidents for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "incidents: owner admin manage" on public.incidents;
create policy "incidents: owner admin manage"
  on public.incidents for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

-- A guard can report an issue and progress it (New -> In Progress), but
-- assigning/resolving/closing/deleting stays an owner/admin action.
drop policy if exists "incidents: security select" on public.incidents;
create policy "incidents: security select"
  on public.incidents for select
  to authenticated
  using (is_residential_security(residential_id));

drop policy if exists "incidents: security insert" on public.incidents;
create policy "incidents: security insert"
  on public.incidents for insert
  to authenticated
  with check (is_residential_security(residential_id));

drop policy if exists "incidents: security update" on public.incidents;
create policy "incidents: security update"
  on public.incidents for update
  to authenticated
  using (is_residential_security(residential_id))
  with check (is_residential_security(residential_id));

-- Any residential member can report a problem and see the inbox, same as
-- security, but has no update policy — only owner/admin/security can
-- change an incident once filed.
drop policy if exists "incidents: members select" on public.incidents;
create policy "incidents: members select"
  on public.incidents for select
  to authenticated
  using (is_residential_member(residential_id));

drop policy if exists "incidents: members insert" on public.incidents;
create policy "incidents: members insert"
  on public.incidents for insert
  to authenticated
  with check (is_residential_member(residential_id));

-- incident_attachments (no delete policy for security/member — only
-- owner/admin/platform can remove an attachment)
drop policy if exists "incident_attachments: platform admin all" on public.incident_attachments;
create policy "incident_attachments: platform admin all"
  on public.incident_attachments for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "incident_attachments: owner admin manage" on public.incident_attachments;
create policy "incident_attachments: owner admin manage"
  on public.incident_attachments for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

drop policy if exists "incident_attachments: security select" on public.incident_attachments;
create policy "incident_attachments: security select"
  on public.incident_attachments for select
  to authenticated
  using (is_residential_security(residential_id));

drop policy if exists "incident_attachments: security insert" on public.incident_attachments;
create policy "incident_attachments: security insert"
  on public.incident_attachments for insert
  to authenticated
  with check (is_residential_security(residential_id));

drop policy if exists "incident_attachments: members select" on public.incident_attachments;
create policy "incident_attachments: members select"
  on public.incident_attachments for select
  to authenticated
  using (is_residential_member(residential_id));

drop policy if exists "incident_attachments: members insert" on public.incident_attachments;
create policy "incident_attachments: members insert"
  on public.incident_attachments for insert
  to authenticated
  with check (is_residential_member(residential_id));

-- ----------------------------------------------------------------------------
-- Table grants
-- ----------------------------------------------------------------------------

grant select, insert, update, delete on public.incidents to authenticated;
grant select, insert, update, delete on public.incident_attachments to authenticated;

grant select, insert, update, delete on
  public.incidents,
  public.incident_attachments
to service_role;

-- ----------------------------------------------------------------------------
-- Storage RLS — same path convention as payment-proofs:
-- "{residential_id}/{incident_id}-{timestamp}.{ext}". Broader than
-- payment-proofs: any residential member (not just admin) can view/attach,
-- since anyone reporting an incident may need to attach a photo. Only
-- owner/admin/platform can delete an attachment file.
-- ----------------------------------------------------------------------------

drop policy if exists "incident_attachments storage: platform admin all" on storage.objects;
create policy "incident_attachments storage: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'incident-attachments' and is_platform_admin())
  with check (bucket_id = 'incident-attachments' and is_platform_admin());

drop policy if exists "incident_attachments storage: member select" on storage.objects;
create policy "incident_attachments storage: member select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and is_residential_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "incident_attachments storage: member insert" on storage.objects;
create policy "incident_attachments storage: member insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'incident-attachments'
    and is_residential_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "incident_attachments storage: admin delete" on storage.objects;
create policy "incident_attachments storage: admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );
