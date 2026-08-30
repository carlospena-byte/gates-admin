/**
 * Addon Item Service
 * Handles CRUD for addon_items — physical instances of an addon (e.g.
 * addon "Parqueo" has items "P1 101", "P1 102"...), each optionally placed
 * in the location hierarchy.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type { AddonItem, CreateAddonItemDto, UpdateAddonItemDto } from "@/types/unit-wizard.types";

const SELECT_WITH_RELATIONS = "*, addons (*, addon_types (*)), locations (*)";

// list(addonId) below filters by addon_id — one addon's own items.
const base = createCrudService<AddonItem, CreateAddonItemDto, UpdateAddonItemDto>("addon_items", {
  selectClause: SELECT_WITH_RELATIONS,
  parentColumn: "addon_id",
});

/**
 * All addon items across every addon for a residential — used to populate
 * the "assign to unit" picker, which assigns a specific item, not a category.
 */
function listByResidential(residentialId: string): Promise<ApiResult<AddonItem[]>> {
  return wrapResult("Failed to list addon items", async () => {
    const rows = await unwrap<AddonItem[]>(
      requireSupabase()
        .from("addon_items")
        .select(SELECT_WITH_RELATIONS)
        .eq("residential_id", residentialId)
        .order("name"),
    );
    return rows ?? [];
  });
}

export const addonItemService = { ...base, listByResidential };
