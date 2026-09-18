/**
 * Unit Resident Service
 * Base CRUD (unit-scoped, used by UnitResidentsPanel) via createCrudService,
 * plus listByResidential for the residential-wide Residents page.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { createCrudService } from "./createCrudService";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type {
  CreateUnitResidentDto,
  ResidentWithUnit,
  UnitResident,
  UpdateUnitResidentDto,
} from "@/types/unit-wizard.types";

const baseService = createCrudService<UnitResident, CreateUnitResidentDto, UpdateUnitResidentDto>(
  "unit_residents",
  { orderBy: "full_name", parentColumn: "unit_id" },
);

function listByResidential(residentialId: string): Promise<ApiResult<ResidentWithUnit[]>> {
  return wrapResult("Failed to list residents", async () => {
    const rows = await unwrap<ResidentWithUnit[]>(
      requireSupabase()
        .from("unit_residents")
        .select("*, units(name)")
        .eq("residential_id", residentialId)
        .order("full_name", { ascending: true }),
    );
    return rows ?? [];
  });
}

export const unitResidentService = { ...baseService, listByResidential };
