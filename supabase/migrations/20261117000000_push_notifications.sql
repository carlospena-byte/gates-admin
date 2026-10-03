-- gates-admin: push_notifications
-- The "Comunicados" section is now a dedicated push composer: an admin writes
-- a title + message, picks where the tap should land (a deeplink destination),
-- who receives it, and when. Immediate sends and scheduled sends share one
-- path: a row with scheduled_at <= now() is dispatched by the
-- send-push-announcement edge function, either called by the admin right after
-- inserting (immediate) or by pg_cron every minute (scheduled).
-- The older `announcements` table is left untouched and no longer used.

create table if not exists public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  residential_id uuid not null references public.residentials(id) on delete cascade,
  title text not null,
  body text not null,
  -- Where a tap lands. The edge function turns this into an in-app route.
  destination text not null default 'home',
  bulletin_id uuid references public.bulletins(id) on delete set null,
  audience text not null default 'everyone',
  status text not null default 'scheduled',
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  recipients integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  error text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_notifications drop constraint if exists push_notifications_destination_check;
alter table public.push_notifications
  add constraint push_notifications_destination_check
  check (destination in ('home', 'bulletins', 'bulletin', 'amenities', 'billing', 'incident_report', 'new_visit', 'profile'));

alter table public.push_notifications drop constraint if exists push_notifications_audience_check;
alter table public.push_notifications
  add constraint push_notifications_audience_check check (audience in ('everyone', 'admins'));

alter table public.push_notifications drop constraint if exists push_notifications_status_check;
alter table public.push_notifications
  add constraint push_notifications_status_check check (status in ('scheduled', 'sending', 'sent', 'failed'));

alter table public.push_notifications drop constraint if exists push_notifications_bulletin_check;
alter table public.push_notifications
  add constraint push_notifications_bulletin_check check (destination <> 'bulletin' or bulletin_id is not null);

create index if not exists idx_push_notifications_residential
  on public.push_notifications(residential_id, created_at desc);
create index if not exists idx_push_notifications_due
  on public.push_notifications(scheduled_at) where status = 'scheduled';

drop trigger if exists update_push_notifications_updated_at on public.push_notifications;
create trigger update_push_notifications_updated_at before update on public.push_notifications
for each row execute function public.update_updated_at_column();

drop trigger if exists audit_push_notifications on public.push_notifications;
create trigger audit_push_notifications after insert or update or delete on public.push_notifications
for each row execute function public.log_audit_event();

alter table public.push_notifications enable row level security;

drop policy if exists "push_notifications: platform admin all" on public.push_notifications;
create policy "push_notifications: platform admin all"
  on public.push_notifications for all
  to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

drop policy if exists "push_notifications: owner admin manage" on public.push_notifications;
create policy "push_notifications: owner admin manage"
  on public.push_notifications for all
  to authenticated
  using (is_residential_admin(residential_id))
  with check (is_residential_admin(residential_id));

grant select, insert, update, delete on public.push_notifications to authenticated;
grant select, insert, update, delete on public.push_notifications to service_role;

-- ----------------------------------------------------------------------------
-- Scheduled dispatch: every minute, ask the edge function to send due rows.
-- Needs the Vault secrets `project_url` and `service_role_key`
-- (same as process-account-deletions).
-- ----------------------------------------------------------------------------

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_dispatch_scheduled_pushes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  service_key text;
begin
  -- Nothing due: skip the HTTP call entirely.
  if not exists (
    select 1 from public.push_notifications
    where status = 'scheduled' and scheduled_at <= now()
  ) then
    return;
  end if;

  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if base_url is null or service_key is null then
    raise warning 'dispatch scheduled pushes skipped: vault secrets project_url/service_role_key are not set';
    return;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/send-push-announcement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

alter function public.invoke_dispatch_scheduled_pushes() owner to postgres;
revoke all on function public.invoke_dispatch_scheduled_pushes() from public, anon, authenticated;

select cron.schedule(
  'dispatch-scheduled-pushes',
  '* * * * *',
  $$select public.invoke_dispatch_scheduled_pushes();$$
);
