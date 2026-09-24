-- gates-admin: security and member only see/manage incidents they reported.
-- owner/admin/platform admin keep full visibility. Previously "members
-- select"/"security select" used is_residential_member()/is_residential_security()
-- alone, so any resident or guard saw every incident in the residential —
-- now scoped to reported_by = auth.uid(). security update is scoped the
-- same way, otherwise a guard could still mutate a report they can no
-- longer see.

-- ----------------------------------------------------------------------------
-- incidents
-- ----------------------------------------------------------------------------

drop policy if exists "incidents: security select" on public.incidents;
create policy "incidents: security select"
  on public.incidents for select
  to authenticated
  using (
    is_residential_security(residential_id)
    and reported_by = auth.uid()
  );

drop policy if exists "incidents: security update" on public.incidents;
create policy "incidents: security update"
  on public.incidents for update
  to authenticated
  using (
    is_residential_security(residential_id)
    and reported_by = auth.uid()
  )
  with check (
    is_residential_security(residential_id)
    and reported_by = auth.uid()
  );

drop policy if exists "incidents: members select" on public.incidents;
create policy "incidents: members select"
  on public.incidents for select
  to authenticated
  using (
    is_residential_member(residential_id)
    and reported_by = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- incident_attachments — same scoping, via the parent incident's reporter
-- ----------------------------------------------------------------------------

drop policy if exists "incident_attachments: security select" on public.incident_attachments;
create policy "incident_attachments: security select"
  on public.incident_attachments for select
  to authenticated
  using (
    is_residential_security(residential_id)
    and exists (
      select 1 from public.incidents i
      where i.id = incident_attachments.incident_id
        and i.reported_by = auth.uid()
    )
  );

drop policy if exists "incident_attachments: members select" on public.incident_attachments;
create policy "incident_attachments: members select"
  on public.incident_attachments for select
  to authenticated
  using (
    is_residential_member(residential_id)
    and exists (
      select 1 from public.incidents i
      where i.id = incident_attachments.incident_id
        and i.reported_by = auth.uid()
    )
  );
