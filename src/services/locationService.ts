/**
 * Location Service
 * Handles CRUD operations for hierarchical locations
 * Supports: TOWER, FLOOR, POLYGON, PASAJE, STREET with parent-child relationships
 */

import { createCrudService } from "./createCrudService";
import type { Location, CreateLocationDto, UpdateLocationDto } from "@/types/unit-wizard.types";

export const locationService = createCrudService<Location, CreateLocationDto, UpdateLocationDto>(
  "locations",
  { selectClause: "*, parent:parent_id(*)" },
);
