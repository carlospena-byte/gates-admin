/**
 * Unit Rental Service
 * Handles CRUD for a unit's rental periods (monthly tenancy or short_term
 * Airbnb-style stays).
 */

import { createCrudService } from "./createCrudService";
import type { CreateUnitRentalDto, UnitRental, UpdateUnitRentalDto } from "@/types/unit-wizard.types";

export const unitRentalService = createCrudService<UnitRental, CreateUnitRentalDto, UpdateUnitRentalDto>(
  "unit_rentals",
  { orderBy: "start_date", parentColumn: "unit_id" },
);
