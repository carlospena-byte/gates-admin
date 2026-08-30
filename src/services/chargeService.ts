/**
 * Charge Service
 * Handles CRUD for recurring/permanent extra charges (e.g. "Seguridad",
 * "Mantenimiento y Limpieza") — separate from addons.
 */

import { createCrudService } from "./createCrudService";
import type { Charge, CreateChargeDto, UpdateChargeDto } from "@/types/unit-wizard.types";

const SELECT_WITH_COUNT = "*, unit_charges(count)";

export const chargeService = createCrudService<Charge, CreateChargeDto, UpdateChargeDto>("charges", {
  selectClause: SELECT_WITH_COUNT,
});
