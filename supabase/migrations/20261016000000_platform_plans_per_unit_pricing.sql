-- gates-admin: per-unit pricing for platform_plans
--
-- Moves platform_plans from a single flat "price" label to a formula the
-- platform can actually bill by:
--   monthly total = max(base_price + price_per_unit * active_units, min_monthly_price)
--
-- The old flat "price" column is left in place (nullable, unused by new UI)
-- rather than dropped, since it may still hold reference data for existing
-- rows and dropping it is not required to add the new fields.

alter table public.platform_plans
  add column if not exists base_price numeric not null default 49.99,
  add column if not exists price_per_unit numeric not null default 0,
  add column if not exists min_monthly_price numeric not null default 0;

alter table public.platform_plans
  drop constraint if exists platform_plans_base_price_min_check;
alter table public.platform_plans
  add constraint platform_plans_base_price_min_check check (base_price >= 49.99);
