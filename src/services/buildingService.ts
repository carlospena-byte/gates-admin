/**
 * Building Service
 * Handles CRUD operations for buildings
 */

import { createCrudService } from "./createCrudService";
import type { Building, CreateBuildingDto, UpdateBuildingDto } from "@/types/unit-wizard.types";

export const buildingService = createCrudService<Building, CreateBuildingDto, UpdateBuildingDto>(
  "buildings",
);
