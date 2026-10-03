-- Security guards sign in with username + 6-digit PIN instead of an email OTP.
--
-- * profiles.username: globally unique, set only for guard accounts. The auth
--   user behind it has a synthetic, never-mailed email (<username>@guardia.vecinoo.app)
--   and the PIN as its password; created/reset by the manage-guard Edge Function.
-- * guard_login_attempts: failed-PIN counter + temporary lockout, read/written
--   only by the guard-login Edge Function (service role; RLS on, no policies).
-- * revoke_user_sessions: lets "Reset PIN" also end that guard's open sessions
--   (guards never time out on their own, so this is the admin's kill switch).

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null;

create table if not exists public.guard_login_attempts (
  username text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz
);
alter table public.guard_login_attempts enable row level security;

create or replace function public.revoke_user_sessions(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.sessions where user_id = _user_id;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
