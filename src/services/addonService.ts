/**
 * Addon Service
 * Handles CRUD operations for addons
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type { Addon, CreateAddonDto, UpdateAddonDto } from "@/types/unit-wizard.types";

const SELECT_WITH_TYPE = "*, addon_types (*)";

const base = createCrudService<Addon, CreateAddonDto, UpdateAddonDto>("addons", {
  selectClause: SELECT_WITH_TYPE,
});

/**
 * List all addons by addon type
 */
function listByType(addonTypeId: string): Promise<ApiResult<Addon[]>> {
  return wrapResult("Failed to list addons", async () => {
    const rows = await unwrap<Addon[]>(
      requireSupabase()
        .from("addons")
        .select(SELECT_WITH_TYPE)
        .eq("addon_type_id", addonTypeId)
        .order("name"),
    );
    return rows ?? [];
  });
}

export const addonService = { ...base, listByType };
