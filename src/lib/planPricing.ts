import type { PlatformPlan } from "@/types/database.types";

/**
 * monthly total = max(base_price + price_per_unit * unitCount, min_monthly_price)
 */
export function computeMonthlyPrice(
  plan: Pick<PlatformPlan, "base_price" | "price_per_unit" | "min_monthly_price">,
  unitCount: number,
): number {
  const raw = plan.base_price + plan.price_per_unit * unitCount;
  return Math.max(raw, plan.min_monthly_price);
}
