-- gates-app: let the person who reported an incident edit it or cancel it
-- while it is still 'new' (nobody has started working on it).
--
--  * adds the 'cancelled' status (kept in the history, never deleted)
--  * members get an UPDATE policy scoped to their own 'new' incidents
--  * a trigger limits what a non-admin can change: title, description and
--    incident type while the row stays 'new', or new -> cancelled. Nothing
--    else (priority, assignee, location, reporter...) can be touched.
--  * reporters can remove attachments of their own 'new' incidents
--    (table rows + storage objects) so photos can be replaced when editing.
-- owner/admin/platform admin keep their existing full access.

alter table public.incidents drop constraint if exists incidents_status_check;
alter table public.incidents
  add constraint incidents_status_check
  check (status in ('new', 'in_progress', 'resolved', 'closed', 'cancelled'));

-- ----------------------------------------------------------------------------
-- incidents: reporter update (own + still new)
-- ----------------------------------------------------------------------------

drop policy if exists "incidents: members update own new" on public.incidents;
create policy "incidents: members update own new"
  on public.incidents for update
  to authenticated
  using (
    is_residential_member(residential_id)
    and reported_by = auth.uid()
    and status = 'new'
  )
  with check (
    is_residential_member(residential_id)
    and reported_by = auth.uid()
    and status in ('new', 'cancelled')
  );

-- security already has an update policy on its own reports; the trigger below
-- applies to it too so a guard cannot progress/resolve through the app's
-- reporter path unless an admin does it.
create or replace function public.restrict_incident_reporter_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_platform_admin() or is_residential_admin(old.residential_id) then
    return new;
  end if;

  -- Service role / internal jobs have no auth.uid(); leave them alone.
  if auth.uid() is null then
    return new;
  end if;

  if new.residential_id is distinct from old.residential_id
     or new.unit_id is distinct from old.unit_id
     or new.reported_by is distinct from old.reported_by
     or new.priority is distinct from old.priority
     or new.assigned_to is distinct from old.assigned_to
     or new.location is distinct from old.location
     or new.resolved_at is distinct from old.resolved_at then
    raise exception 'Only an administrator can change those incident fields'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'new' and new.status = 'cancelled') then
    raise exception 'Only an administrator can change the incident status'
      using errcode = '42501';
  end if;

  if old.status <> 'new' and (
       new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.incident_type_id is distinct from old.incident_type_id
     ) then
    raise exception 'Incident can no longer be edited'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists restrict_incident_reporter_update on public.incidents;
create trigger restrict_incident_reporter_update
  before update on public.incidents
  for each row execute function public.restrict_incident_reporter_update();

-- ----------------------------------------------------------------------------
-- incident_attachments: reporter can delete while the incident is new
-- ----------------------------------------------------------------------------

drop policy if exists "incident_attachments: reporter delete while new" on public.incident_attachments;
create policy "incident_attachments: reporter delete while new"
  on public.incident_attachments for delete
  to authenticated
  using (
    exists (
      select 1 from public.incidents i
      where i.id = incident_attachments.incident_id
        and i.reported_by = auth.uid()
        and i.status = 'new'
    )
  );

-- Storage objects are named "{residential_id}/{incident_id}-{ts}.{ext}".
drop policy if exists "incident_attachments storage: reporter delete while new" on storage.objects;
create policy "incident_attachments storage: reporter delete while new"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and exists (
      select 1 from public.incident_attachments a
      join public.incidents i on i.id = a.incident_id
      where a.storage_path = storage.objects.name
        and i.reported_by = auth.uid()
        and i.status = 'new'
    )
  );
