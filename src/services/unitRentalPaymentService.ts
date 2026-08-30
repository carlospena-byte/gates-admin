/**
 * Unit Rental Payment Service
 * Handles CRUD for the payment installments owed against a unit_rental.
 */

import { createCrudService } from "./createCrudService";
import type {
  CreateUnitRentalPaymentDto,
  UnitRentalPayment,
  UpdateUnitRentalPaymentDto,
} from "@/types/unit-wizard.types";

export const unitRentalPaymentService = createCrudService<
  UnitRentalPayment,
  CreateUnitRentalPaymentDto,
  UpdateUnitRentalPaymentDto
>("unit_rental_payments", { orderBy: "due_date", parentColumn: "rental_id" });
