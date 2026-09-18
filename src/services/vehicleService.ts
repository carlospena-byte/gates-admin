/**
 * Vehicle Service
 * Handles CRUD operations for vehicles registered to a unit.
 */

import { createCrudService } from "./createCrudService";
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from "@/types/visitor.types";

export const vehicleService = createCrudService<Vehicle, CreateVehicleDto, UpdateVehicleDto>("vehicles", {
  orderBy: "plate",
  parentColumn: "unit_id",
});
