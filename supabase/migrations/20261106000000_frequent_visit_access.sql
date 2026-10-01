-- gates-app: "Acceso frecuente" flow (Figma 09 · Visitas / Acceso frecuente).
--
-- * schedule_blocks: custom frequency groups days that share a time window,
--   e.g. [{"days":["mon","tue"],"start":"08:00:00","end":"22:00:00"}]. The
--   legacy recurrence / recurrence_days / schedule_* columns stay populated
--   (days = union of the blocks, times = first block) so readers that only
--   know the old shape keep working.
-- * has_vehicle / notify_on_arrival: the "Ingresará en vehículo" and
--   "Avisarme al llegar" switches.
-- * Residents attach the visitor's ID document themselves, so members may now
--   insert into visitor-id-photos under their own residential's folder.
-- * Residents can read the access_logs of their own unit's visitors, which is
--   what the "Último movimiento" section of the detail screen shows.

alter table public.visitors
  add column if not exists schedule_blocks jsonb,
  add column if not exists has_vehicle boolean not null default false,
  add column if not exists notify_on_arrival boolean not null default false;

drop policy if exists "visitor-id-photos: member insert" on storage.objects;
create policy "visitor-id-photos: member insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'visitor-id-photos'
    and is_residential_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "access_logs: unit members select" on public.access_logs;
create policy "access_logs: unit members select"
  on public.access_logs for select
  to authenticated
  using (
    exists (
      select 1
      from public.visitors v
      join public.unit_members um on um.unit_id = v.unit_id
      where v.id = access_logs.visitor_id
        and um.user_id = auth.uid()
    )
  );
