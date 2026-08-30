/**
 * Unit Resident Service
 * Handles CRUD operations for people authorized to be in a unit.
 */

import { createCrudService } from "./createCrudService";
import type { UnitResident, CreateUnitResidentDto, UpdateUnitResidentDto } from "@/types/unit-wizard.types";

export const unitResidentService = createCrudService<
  UnitResident,
  CreateUnitResidentDto,
  UpdateUnitResidentDto
>("unit_residents", { orderBy: "full_name", parentColumn: "unit_id" });
