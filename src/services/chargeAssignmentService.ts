/**
 * Charge Assignment Service
 * Rules that say which units a charge applies to: a location and everything
 * under it, one location only, or one exact unit.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type {
  ChargeAssignment,
  CreateChargeAssignmentDto,
  UnitApplicableCharge,
  UpdateChargeAssignmentDto,
} from "@/types/unit-wizard.types";

const base = createCrudService<ChargeAssignment, CreateChargeAssignmentDto, UpdateChargeAssignmentDto>(
  "charge_assignments",
  { selectClause: "*, units (id, name)", orderBy: "created_at", parentColumn: "charge_id" },
);

/** Charges that apply to one unit (through any rule), with the amount it pays. */
function listByUnit(unitId: string): Promise<ApiResult<UnitApplicableCharge[]>> {
  return wrapResult("Failed to list unit charges", async () => {
    const rows = await unwrap<UnitApplicableCharge[]>(
      requireSupabase().rpc("unit_applicable_charges", { _unit_id: unitId }),
    );
    return rows ?? [];
  });
}

export const chargeAssignmentService = { ...base, listByUnit };
