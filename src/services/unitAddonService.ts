/**
 * Unit Addon Service
 * Manages unit_addons join table entries
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

async function createMany(unitId: string, addonItemIds: string[]): Promise<ApiResult<void>> {
  if (addonItemIds.length === 0) {
    return { success: true, data: undefined };
  }

  return wrapResult("Failed to add unit addons", () =>
    unwrap<void>(
      requireSupabase()
        .from("unit_addons")
        .insert(addonItemIds.map((addonItemId) => ({ unit_id: unitId, addon_item_id: addonItemId }))),
    ),
  );
}

async function deleteByUnitId(unitId: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to remove unit addons", () =>
    unwrap<void>(requireSupabase().from("unit_addons").delete().eq("unit_id", unitId)),
  );
}

export const unitAddonService = { createMany, deleteByUnitId };
