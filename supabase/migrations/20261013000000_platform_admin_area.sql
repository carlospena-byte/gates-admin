-- gates-admin: platform admin area
--
-- Adds what the Platform Admin UI needs beyond what already existed
-- (residentials list + global services):
--   1. platform_plans: a simple catalog (name/price/is_active) that platform
--      admins maintain and residentials get assigned to. No billing/payment
--      processing — just a plan label with a price, for now.
--   2. residentials.plan_id: FK to platform_plans. plan_type (free text) is
--      left in place for backward compatibility; new UI writes plan_id.
--   3. platform_admins: today only has a self-select policy (managed by
--      service role / Supabase dashboard per the comment in schema.sql).
--      Adds a "platform admin manage all" policy so existing platform
--      admins can add/remove other platform admins from the app itself,
--      mirroring the "residential_users: platform admin all" policy.

create table if not exists public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.platform_plans enable row level security;

-- Readable by any authenticated user: the residential signup flow and the
-- residential-side settings need to show plan choices too, not just
-- platform admins.
drop policy if exists "platform_plans: select all authenticated" on public.platform_plans;
create policy "platform_plans: select all authenticated"
  on public.platform_plans for select to authenticated
  using (true);

drop policy if exists "platform_plans: platform admin all" on public.platform_plans;
create policy "platform_plans: platform admin all"
  on public.platform_plans for all to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

grant select, insert, update, delete on public.platform_plans to authenticated;

drop trigger if exists audit_platform_plans on public.platform_plans;
create trigger audit_platform_plans after insert or update or delete on public.platform_plans
for each row execute function public.log_audit_event();

alter table public.residentials
  add column if not exists plan_id uuid references public.platform_plans(id);

drop policy if exists "platform_admins: platform admin all" on public.platform_admins;
create policy "platform_admins: platform admin all"
  on public.platform_admins for all to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());

grant insert, delete on public.platform_admins to authenticated;
