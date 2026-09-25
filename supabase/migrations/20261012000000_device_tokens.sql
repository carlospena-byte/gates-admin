-- gates-admin: device_tokens
-- Stores one row per (user, installed app) FCM registration token, so the
-- send-push-notification edge function knows where to deliver a push for a
-- given user. Purely user-owned — no residential_id, since a device isn't
-- scoped to one residential (a security guard's phone could theoretically
-- move between them). RLS follows the "own rows only" pattern rather than
-- the is_residential_* helpers used elsewhere.

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (token)
);

alter table public.device_tokens drop constraint if exists device_tokens_platform_check;
alter table public.device_tokens
  add constraint device_tokens_platform_check check (platform in ('ios', 'android'));

create index if not exists idx_device_tokens_user_id on public.device_tokens(user_id);

drop trigger if exists update_device_tokens_updated_at on public.device_tokens;
create trigger update_device_tokens_updated_at before update on public.device_tokens
for each row execute function public.update_updated_at_column();

alter table public.device_tokens enable row level security;

-- A device re-registering (app reinstall, token refresh landing on a
-- different user) upserts on the `token` unique constraint, so the owning
-- user_id can legitimately change — hence "for all" rather than
-- split insert/update policies.
drop policy if exists "device_tokens: own manage" on public.device_tokens;
create policy "device_tokens: own manage"
  on public.device_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
