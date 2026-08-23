/**
 * Addon Type Service
 * Handles CRUD operations for addon types
 */

import { createCrudService } from "./createCrudService";
import type { AddonType, CreateAddonTypeDto, UpdateAddonTypeDto } from "@/types/unit-wizard.types";

export const addonTypeService = createCrudService<
  AddonType,
  CreateAddonTypeDto,
  UpdateAddonTypeDto
>("addon_types");
