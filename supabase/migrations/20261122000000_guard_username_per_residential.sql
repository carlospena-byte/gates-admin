-- Guard usernames are unique per residential, not globally.
--
-- Guards now sign in with residential code + username + PIN, so two
-- residentials can each have a "carlos".
--
-- * residentials.code: short public identifier (a-z0-9, 4-12 chars), unique,
--   auto-generated from the name. The guard types it on the login screen.
-- * profiles.guard_residential_id: the residential a guard account belongs to.
--   (residential_id, lower(username)) replaces the old global username index.
-- * guard_login_attempts: now keyed by "<code>:<username>" (and "ip:<addr>"),
--   so unknown codes/usernames are counted too and nothing reveals which exist.
--
-- Existing guards keep their auth email (<username>@guardia.vecinoo.app):
-- guard-login looks the email up on the profile, so no Auth migration is needed.
-- New guards get <username>.<residential id>@guardia.vecinoo.app.

-- ---------------------------------------------------------------------------
-- residentials.code
-- ---------------------------------------------------------------------------

alter table public.residentials add column if not exists code text;

create or replace function public.generate_residential_code(_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  base := regexp_replace(
    translate(lower(coalesce(_name, '')), 'áéíóúüñàèìòùâêîôû', 'aeiouunaeiouaeiou'),
    '[^a-z0-9]', '', 'g'
  );
  base := substr(base, 1, 10);
  if length(base) < 4 then
    base := base || substr(md5(random()::text), 1, 4 - length(base));
  end if;

  candidate := base;
  while exists (select 1 from public.residentials where lower(code) = candidate) loop
    n := n + 1;
    candidate := substr(base, 1, 12 - length(n::text)) || n::text;
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_residential_code(text) from public, anon, authenticated;

-- Backfill one by one so each generated code sees the previous ones.
do $$
declare
  r record;
begin
  for r in select id, name from public.residentials where code is null order by created_at loop
    update public.residentials set code = public.generate_residential_code(r.name) where id = r.id;
  end loop;
end;
$$;

create or replace function public.set_residential_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.code is null or new.code = '' then
    new.code := public.generate_residential_code(new.name);
  else
    new.code := lower(new.code);
  end if;
  return new;
end;
$$;

drop trigger if exists residentials_set_code on public.residentials;
create trigger residentials_set_code
  before insert on public.residentials
  for each row execute function public.set_residential_code();

alter table public.residentials alter column code set not null;

alter table public.residentials drop constraint if exists residentials_code_format;
alter table public.residentials
  add constraint residentials_code_format check (code ~ '^[a-z0-9]{4,12}$');

create unique index if not exists residentials_code_unique on public.residentials (lower(code));

-- ---------------------------------------------------------------------------
-- profiles.guard_residential_id + per-residential username uniqueness
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists guard_residential_id uuid references public.residentials(id) on delete set null;

-- Existing guards: their (single) security membership is their residential.
update public.profiles p
set guard_residential_id = (
  select ru.residential_id
  from public.residential_users ru
  where ru.user_id = p.user_id and ru.role = 'security'
  order by ru.created_at
  limit 1
)
where p.username is not null and p.guard_residential_id is null;

drop index if exists public.profiles_username_unique;

create unique index if not exists profiles_guard_username_unique
  on public.profiles (guard_residential_id, lower(username))
  where username is not null;

-- ---------------------------------------------------------------------------
-- guard_login_attempts: composite string key instead of a bare username
-- ---------------------------------------------------------------------------

-- Lockout state is short-lived; start clean under the new key format.
delete from public.guard_login_attempts;
alter table public.guard_login_attempts rename column username to key;
