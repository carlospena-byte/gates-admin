-- gates-app profile self-service: avatar, email-change sync and account
-- deletion requests.
--
--  * profiles.avatar_url + a public `avatars` bucket where each user can only
--    write inside their own `<user_id>/` folder.
--  * auth.users email changes (the app confirms the new address with an OTP)
--    are mirrored into profiles.email.
--  * Account deletion is a request, not an immediate delete: the resident
--    asks, the account stays usable (and the request can be cancelled) and
--    the process-account-deletions edge function removes everything once
--    one calendar month has passed. A daily pg_cron job calls it.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists deletion_scheduled_for timestamptz;

-- ----------------------------------------------------------------------------
-- Avatars bucket
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: own insert" on storage.objects;
create policy "avatars: own insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: own update" on storage.objects;
create policy "avatars: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: own delete" on storage.objects;
create policy "avatars: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Keep profiles.email in sync when the auth email changes
-- ----------------------------------------------------------------------------

create or replace function public.handle_auth_user_email_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute procedure public.handle_auth_user_email_changed();

-- ----------------------------------------------------------------------------
-- Account deletion requests
-- ----------------------------------------------------------------------------

create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  scheduled timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.profiles
  set deletion_scheduled_for = coalesce(deletion_scheduled_for, now() + interval '1 month')
  where user_id = auth.uid()
  returning deletion_scheduled_for into scheduled;

  return scheduled;
end;
$$;

create or replace function public.cancel_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.profiles
  set deletion_scheduled_for = null
  where user_id = auth.uid();
end;
$$;

revoke all on function public.request_account_deletion() from public, anon;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.cancel_account_deletion() to authenticated;

-- Residents must go through the RPCs above (security definer, so they run as
-- the function owner): a direct update could push the deadline back forever
-- or clear a request the admin is relying on.
create or replace function public.guard_deletion_schedule()
returns trigger
language plpgsql
as $$
begin
  if new.deletion_scheduled_for is distinct from old.deletion_scheduled_for
     and current_user in ('authenticated', 'anon') then
    raise exception 'use request_account_deletion() / cancel_account_deletion()'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles_deletion_schedule on public.profiles;
create trigger guard_profiles_deletion_schedule
before update on public.profiles
for each row execute function public.guard_deletion_schedule();

-- ----------------------------------------------------------------------------
-- Daily purge of accounts whose month is up
-- ----------------------------------------------------------------------------
-- Calls the process-account-deletions edge function (it also has to remove
-- the avatar files and the auth user, which SQL alone can't do cleanly).
-- Needs two Vault secrets: `project_url` and `service_role_key`
-- (https://supabase.com/docs/guides/functions/schedule-functions).

create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_process_account_deletions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';

  if base_url is null or service_key is null then
    raise warning 'process-account-deletions skipped: vault secrets project_url/service_role_key are not set';
    return;
  end if;

  perform net.http_post(
    url := base_url || '/functions/v1/process-account-deletions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

alter function public.invoke_process_account_deletions() owner to postgres;
revoke all on function public.invoke_process_account_deletions() from public, anon, authenticated;

select cron.schedule(
  'process-account-deletions',
  '30 3 * * *',
  $$select public.invoke_process_account_deletions();$$
);
