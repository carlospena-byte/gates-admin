/**
 * Unit Type Service
 * Handles CRUD operations for unit types
 */

import { createCrudService } from "./createCrudService";
import type { UnitType, CreateUnitTypeDto, UpdateUnitTypeDto } from "@/types/unit-wizard.types";

export const unitTypeService = createCrudService<UnitType, CreateUnitTypeDto, UpdateUnitTypeDto>(
  "unit_types",
);
