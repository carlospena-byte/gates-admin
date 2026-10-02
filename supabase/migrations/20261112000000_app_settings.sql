-- gates-admin: platform "App Settings"
--
--   1. app_config: single-row table holding the maintenance switch. The mobile
--      app reads it (through get_app_status) before anything else, so it is
--      reachable by anon too — a signed-out user must also see the
--      "under maintenance" screen.
--   2. app_versions: one row per release *per store platform* (ios / android
--      never mix). `is_forced` = the app blocks until the user updates;
--      otherwise it only shows a dismissible "update available" screen.
--   3. push_campaigns: history of mass push notifications sent from the admin
--      (audience = everyone, or a set of residentials). Written by the
--      send-mass-push edge function; platform admins can read it.
--   4. get_app_status(platform, version): the single call the app makes.

-- ----------------------------------------------------------------------------
-- app_config (singleton)
-- ----------------------------------------------------------------------------

create table if not exists public.app_config (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  maintenance_enabled boolean not null default false,
  maintenance_title text,
  maintenance_message text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (singleton) values (true) on conflict (singleton) do nothing;

drop trigger if exists update_app_config_updated_at on public.app_config;
create trigger update_app_config_updated_at before update on public.app_config
for each row execute function public.update_updated_at_column();

alter table public.app_config enable row level security;

drop policy if exists "app_config: select all" on public.app_config;
create policy "app_config: select all"
  on public.app_config for select to anon, authenticated
  using (true);

drop policy if exists "app_config: platform admin update" on public.app_config;
create policy "app_config: platform admin update"
  on public.app_config for update to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

grant select on public.app_config to anon, authenticated;
grant update on public.app_config to authenticated;
grant select, insert, update, delete on public.app_config to service_role;

drop trigger if exists audit_app_config on public.app_config;
create trigger audit_app_config after update on public.app_config
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- app_versions (per store platform)
-- ----------------------------------------------------------------------------

create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android')),
  version text not null check (version ~ '^\d+(\.\d+){0,2}$'),
  is_forced boolean not null default false,
  title text,
  message text,
  store_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, version)
);

create index if not exists idx_app_versions_platform on public.app_versions(platform);

drop trigger if exists update_app_versions_updated_at on public.app_versions;
create trigger update_app_versions_updated_at before update on public.app_versions
for each row execute function public.update_updated_at_column();

alter table public.app_versions enable row level security;

drop policy if exists "app_versions: platform admin all" on public.app_versions;
create policy "app_versions: platform admin all"
  on public.app_versions for all to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

grant select, insert, update, delete on public.app_versions to authenticated;
grant select, insert, update, delete on public.app_versions to service_role;

drop trigger if exists audit_app_versions on public.app_versions;
create trigger audit_app_versions after insert or update or delete on public.app_versions
for each row execute function public.log_audit_event();

-- ----------------------------------------------------------------------------
-- push_campaigns (mass push history)
-- ----------------------------------------------------------------------------

create table if not exists public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null check (audience in ('all', 'residentials')),
  residential_ids uuid[] not null default '{}',
  recipients integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_campaigns_created_at on public.push_campaigns(created_at desc);

alter table public.push_campaigns enable row level security;

drop policy if exists "push_campaigns: platform admin select" on public.push_campaigns;
create policy "push_campaigns: platform admin select"
  on public.push_campaigns for select to authenticated
  using (is_platform_admin());

grant select on public.push_campaigns to authenticated;
grant select, insert, update, delete on public.push_campaigns to service_role;

-- ----------------------------------------------------------------------------
-- get_app_status: what the mobile app asks on launch / resume
-- ----------------------------------------------------------------------------
-- Returns:
--   { maintenance: { enabled, title, message },
--     update: null | { version, is_forced, title, message, store_url } }
-- `update` is the newest active release for the platform that is newer than
-- the installed version. It is forced when ANY newer active release is forced
-- (so skipping a forced build can't be bypassed by a later optional one).
-- Versions compare numerically ("1.10.0" > "1.9.0").

create or replace function public.get_app_status(p_platform text, p_version text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cfg public.app_config;
  v_installed int[];
  v_latest public.app_versions;
  v_forced boolean;
  v_update jsonb := null;
begin
  select * into v_cfg from public.app_config limit 1;

  begin
    v_installed := string_to_array(p_version, '.')::int[];
  exception when others then
    v_installed := null;
  end;

  if v_installed is not null and p_platform in ('ios', 'android') then
    select * into v_latest
    from public.app_versions v
    where v.platform = p_platform
      and v.is_active
      and string_to_array(v.version, '.')::int[] > v_installed
    order by string_to_array(v.version, '.')::int[] desc
    limit 1;

    if found then
      select coalesce(bool_or(v.is_forced), false) into v_forced
      from public.app_versions v
      where v.platform = p_platform
        and v.is_active
        and string_to_array(v.version, '.')::int[] > v_installed;

      v_update := jsonb_build_object(
        'version', v_latest.version,
        'is_forced', v_forced,
        'title', v_latest.title,
        'message', v_latest.message,
        'store_url', v_latest.store_url
      );
    end if;
  end if;

  return jsonb_build_object(
    'maintenance', jsonb_build_object(
      'enabled', coalesce(v_cfg.maintenance_enabled, false),
      'title', v_cfg.maintenance_title,
      'message', v_cfg.maintenance_message
    ),
    'update', v_update
  );
end;
$$;

revoke all on function public.get_app_status(text, text) from public;
grant execute on function public.get_app_status(text, text) to anon, authenticated;
