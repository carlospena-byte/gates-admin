/**
 * Location Type Service
 * Handles CRUD operations for location type definitions
 */

import { createCrudService } from "./createCrudService";
import type {
  LocationTypeDefinition,
  CreateLocationTypeDto,
  UpdateLocationTypeDto,
} from "@/types/unit-wizard.types";

export const locationTypeService = createCrudService<
  LocationTypeDefinition,
  CreateLocationTypeDto,
  UpdateLocationTypeDto
>("location_types");
