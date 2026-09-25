-- gates-admin: anchored pricing for platform_plans
--
-- Lets a plan "anchor" its pricing to another plan: same base_price, plus a
-- fixed price_per_unit_offset. This keeps the anchored plan's *effective*
-- per-unit price (base/units + price_per_unit) a constant amount away from
-- the anchor plan's, for any unit count — e.g. Básico can be permanently
-- $0.30/unit cheaper than Pro, and stays that way automatically if Pro's
-- pricing is edited later.
--
-- Only one level of anchoring is supported (an anchor plan cannot itself be
-- anchored) to avoid chains/cycles.

alter table public.platform_plans
  add column if not exists price_anchor_plan_id uuid references public.platform_plans(id) on delete set null,
  add column if not exists price_per_unit_offset numeric;

alter table public.platform_plans
  drop constraint if exists platform_plans_no_self_anchor_check;
alter table public.platform_plans
  add constraint platform_plans_no_self_anchor_check check (price_anchor_plan_id is distinct from id);

-- Before insert/update: if anchored, force base_price/price_per_unit to
-- track the anchor plan's current values + offset. Rejects anchoring to a
-- plan that is itself anchored (no chains).
create or replace function public.sync_platform_plan_anchor_pricing()
returns trigger
language plpgsql
as $$
declare
  anchor record;
begin
  if new.price_anchor_plan_id is not null then
    select base_price, price_per_unit, price_anchor_plan_id as anchor_of_anchor
      into anchor
      from public.platform_plans
      where id = new.price_anchor_plan_id;

    if found then
      if anchor.anchor_of_anchor is not null then
        raise exception 'Cannot anchor to a plan that is itself anchored to another plan';
      end if;
      new.base_price := anchor.base_price;
      new.price_per_unit := anchor.price_per_unit + coalesce(new.price_per_unit_offset, 0);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists platform_plans_sync_anchor_pricing on public.platform_plans;
create trigger platform_plans_sync_anchor_pricing
before insert or update on public.platform_plans
for each row execute function public.sync_platform_plan_anchor_pricing();

-- After a plan's own base_price/price_per_unit change, cascade the new
-- values into any plan anchored to it.
create or replace function public.cascade_platform_plan_anchor_pricing()
returns trigger
language plpgsql
as $$
begin
  if new.base_price is distinct from old.base_price or new.price_per_unit is distinct from old.price_per_unit then
    update public.platform_plans
    set base_price = new.base_price,
        price_per_unit = new.price_per_unit + coalesce(price_per_unit_offset, 0)
    where price_anchor_plan_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists platform_plans_cascade_anchor_pricing on public.platform_plans;
create trigger platform_plans_cascade_anchor_pricing
after update on public.platform_plans
for each row execute function public.cascade_platform_plan_anchor_pricing();
