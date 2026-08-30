/**
 * Unit Charge Service
 * Handles CRUD for a unit's assignment to a charge, plus bulk-assigning one
 * price to many units at once (by tower, by unit type, or manually) so
 * admins don't have to check units off one by one.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type { CreateUnitChargeDto, UnitCharge, UpdateUnitChargeDto } from "@/types/unit-wizard.types";

const SELECT_WITH_UNIT = "*, units (id, name)";

// list(chargeId) below filters by charge_id — one charge's own assignments.
const base = createCrudService<UnitCharge, CreateUnitChargeDto, UpdateUnitChargeDto>("unit_charges", {
  selectClause: SELECT_WITH_UNIT,
  orderBy: "created_at",
  parentColumn: "charge_id",
});

/** All charge assignments for a single unit — used for a unit's read-only charges list. */
function listByUnit(unitId: string): Promise<ApiResult<UnitCharge[]>> {
  return wrapResult("Failed to list unit charges", async () => {
    const rows = await unwrap<UnitCharge[]>(
      requireSupabase().from("unit_charges").select("*, charges (*)").eq("unit_id", unitId),
    );
    return rows ?? [];
  });
}

/**
 * Assigns `price` for `chargeId` to every unit in `unitIds` in one shot —
 * creates the assignment where missing, updates the price where it already
 * exists (charge_id + unit_id is unique).
 */
function bulkAssign(
  residentialId: string,
  chargeId: string,
  unitIds: string[],
  price: number,
): Promise<ApiResult<void>> {
  if (unitIds.length === 0) {
    return Promise.resolve({ success: true, data: undefined });
  }

  return wrapResult("Failed to assign charge", () =>
    unwrap<void>(
      requireSupabase()
        .from("unit_charges")
        .upsert(
          unitIds.map((unitId) => ({
            residential_id: residentialId,
            charge_id: chargeId,
            unit_id: unitId,
            price,
            is_active: true,
          })),
          { onConflict: "charge_id,unit_id" },
        ),
    ),
  );
}

export const unitChargeService = { ...base, listByUnit, bulkAssign };
