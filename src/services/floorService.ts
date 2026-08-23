/**
 * Floor Service
 * Handles CRUD operations for floors within buildings
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type { Floor, CreateFloorDto, UpdateFloorDto } from "@/types/unit-wizard.types";

const SELECT_WITH_BUILDING = "*, buildings(*)";

const { getById, create, update, delete: remove, toggleActive } = createCrudService<
  Floor,
  CreateFloorDto,
  UpdateFloorDto
>("floors", { selectClause: SELECT_WITH_BUILDING });

/**
 * List all floors for a building
 */
function listByBuilding(buildingId: string): Promise<ApiResult<Floor[]>> {
  return wrapResult("Failed to list floors", async () => {
    const rows = await unwrap<Floor[]>(
      requireSupabase()
        .from("floors")
        .select(SELECT_WITH_BUILDING)
        .eq("building_id", buildingId)
        .order("name"),
    );
    return rows ?? [];
  });
}

/**
 * List all floors for a residential (across all buildings)
 */
function listByResidential(residentialId: string): Promise<ApiResult<Floor[]>> {
  return wrapResult("Failed to list floors", async () => {
    const rows = await unwrap<Floor[]>(
      requireSupabase()
        .from("floors")
        .select("*, buildings!inner(*)")
        .eq("buildings.residential_id", residentialId)
        .order("buildings(name)")
        .order("name"),
    );
    return rows ?? [];
  });
}

export const floorService = {
  listByBuilding,
  listByResidential,
  getById,
  create,
  update,
  delete: remove,
  toggleActive,
};
