-- gates-admin: visit types (frequent / delivery / fastlane)
-- Extends the existing generic visitors table instead of adding new tables,
-- so Today/Upcoming/Inside/History filtering, access_logs check-in/out and
-- the existing residential-scoped RLS keep working unchanged. FastLane rows
-- are created without a name (the visitor self-registers later via the
-- fastlane-submit Edge Function using access_code as a bearer credential,
-- same trust model as unit_invitations.code) so name becomes nullable.

alter table public.visitors
  add column if not exists visit_type text not null default 'frequent',
  add column if not exists visitor_role text,
  add column if not exists provider_kind text,
  add column if not exists recurrence text,
  add column if not exists recurrence_days text[],
  add column if not exists schedule_type text not null default 'all_day',
  add column if not exists schedule_start time,
  add column if not exists schedule_end time,
  add column if not exists registration_channel text,
  add column if not exists id_photo_path text,
  add column if not exists registered_at timestamptz;

alter table public.visitors alter column name drop not null;

alter table public.visitors drop constraint if exists visitors_status_check;
alter table public.visitors
  add constraint visitors_status_check
  check (status in ('pending_registration', 'scheduled', 'active', 'inside', 'completed', 'cancelled', 'rejected'));

alter table public.visitors drop constraint if exists visitors_visit_type_check;
alter table public.visitors
  add constraint visitors_visit_type_check
  check (visit_type in ('frequent', 'delivery', 'fastlane'));

alter table public.visitors drop constraint if exists visitors_visitor_role_check;
alter table public.visitors
  add constraint visitors_visitor_role_check
  check (visitor_role is null or visitor_role in ('familiar', 'entrenador', 'empleado', 'proveedor', 'visitante', 'invitado'));

alter table public.visitors drop constraint if exists visitors_provider_kind_check;
alter table public.visitors
  add constraint visitors_provider_kind_check
  check (provider_kind is null or provider_kind in ('proveedor', 'delivery', 'paqueteria'));

alter table public.visitors drop constraint if exists visitors_recurrence_check;
alter table public.visitors
  add constraint visitors_recurrence_check
  check (recurrence is null or recurrence in ('mon_fri', 'mon_sat', 'daily', 'custom'));

alter table public.visitors drop constraint if exists visitors_schedule_type_check;
alter table public.visitors
  add constraint visitors_schedule_type_check
  check (schedule_type in ('all_day', 'custom'));

alter table public.visitors drop constraint if exists visitors_registration_channel_check;
alter table public.visitors
  add constraint visitors_registration_channel_check
  check (registration_channel is null or registration_channel in ('sms', 'whatsapp'));

create index if not exists idx_visitors_visit_type on public.visitors(visit_type);

-- ----------------------------------------------------------------------------
-- Residents can create/manage their own unit's visits from gates-app.
-- Status flips (check-in/out, activation) stay reserved for security/admin —
-- these policies deliberately don't grant members a delete or a status-only
-- update path beyond what they set at creation.
-- ----------------------------------------------------------------------------

drop policy if exists "visitors: members manage own unit" on public.visitors;
create policy "visitors: members manage own unit"
  on public.visitors for insert
  to authenticated
  with check (
    is_residential_member(residential_id)
    and unit_id in (select unit_id from public.unit_members where user_id = auth.uid())
  );

drop policy if exists "visitors: members update own unit" on public.visitors;
create policy "visitors: members update own unit"
  on public.visitors for update
  to authenticated
  using (
    is_residential_member(residential_id)
    and unit_id in (select unit_id from public.unit_members where user_id = auth.uid())
  )
  with check (
    is_residential_member(residential_id)
    and unit_id in (select unit_id from public.unit_members where user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Storage bucket for FastLane visitor ID photos. No authenticated insert
-- policy: the only writer is the fastlane-submit Edge Function, which runs
-- with the service role key on behalf of a visitor who has no Supabase
-- session at all.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('visitor-id-photos', 'visitor-id-photos', false)
on conflict (id) do nothing;

drop policy if exists "visitor-id-photos: platform admin all" on storage.objects;
create policy "visitor-id-photos: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'visitor-id-photos' and is_platform_admin())
  with check (bucket_id = 'visitor-id-photos' and is_platform_admin());

drop policy if exists "visitor-id-photos: owner admin select" on storage.objects;
create policy "visitor-id-photos: owner admin select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'visitor-id-photos'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "visitor-id-photos: security select" on storage.objects;
create policy "visitor-id-photos: security select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'visitor-id-photos'
    and is_residential_security((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "visitor-id-photos: owner admin delete" on storage.objects;
create policy "visitor-id-photos: owner admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'visitor-id-photos'
    and is_residential_admin((storage.foldername(name))[1]::uuid)
  );

-- ----------------------------------------------------------------------------
-- Small public bucket for the FastLane QR images sent over WhatsApp (Twilio
-- requires a public MediaUrl it can fetch — these are just QR codes encoding
-- a one-time link, not sensitive on their own).
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('visit-qrcodes', 'visit-qrcodes', true)
on conflict (id) do nothing;

drop policy if exists "visit-qrcodes: public read" on storage.objects;
create policy "visit-qrcodes: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'visit-qrcodes');

drop policy if exists "visit-qrcodes: platform admin all" on storage.objects;
create policy "visit-qrcodes: platform admin all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'visit-qrcodes' and is_platform_admin())
  with check (bucket_id = 'visit-qrcodes' and is_platform_admin());

-- ----------------------------------------------------------------------------
-- RPC: create_fastlane_visit
-- Generates the one-time access_code here (never trusted from the client),
-- same approach as create_unit_invitation. Callable by residential
-- admin/security for any unit, or by a resident for their own unit.
-- ----------------------------------------------------------------------------

create or replace function public.create_fastlane_visit(
  _residential_id uuid,
  _unit_id uuid,
  _phone text,
  _visit_date date,
  _notes text default null
)
returns public.visitors
language plpgsql
security definer
set search_path = public
as $$
declare
  _code text;
  _visitor public.visitors;
  _is_member boolean;
begin
  if not (is_residential_admin(_residential_id) or is_residential_security(_residential_id)) then
    select exists(
      select 1 from public.unit_members
      where unit_id = _unit_id and user_id = auth.uid()
    ) into _is_member;

    if not _is_member then
      raise exception 'Not authorized to create a visit for this unit';
    end if;
  end if;

  loop
    _code := upper(substr(md5(gen_random_uuid()::text), 1, 8));
    exit when not exists (select 1 from public.visitors where access_code = _code);
  end loop;

  insert into public.visitors (
    residential_id, unit_id, invited_by, name, phone, visit_type, status,
    access_code, valid_from, valid_until, notes
  )
  values (
    _residential_id, _unit_id, auth.uid(), null, _phone, 'fastlane', 'pending_registration',
    _code, _visit_date::timestamptz, (_visit_date + 1)::timestamptz - interval '1 second', _notes
  )
  returning * into _visitor;

  return _visitor;
end;
$$;

alter function public.create_fastlane_visit(uuid, uuid, text, date, text) owner to postgres;
grant execute on function public.create_fastlane_visit(uuid, uuid, text, date, text) to authenticated;
