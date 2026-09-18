/**
 * Amenity Booking Service
 * Flat CRUD via createCrudService, same composition as vehicleService.ts.
 * selectClause joins the booking user's email for display.
 */

import { createCrudService } from "./createCrudService";
import type {
  AmenityBookingWithUser,
  CreateAmenityBookingDto,
  UpdateAmenityBookingDto,
} from "@/types/amenities.types";

export const amenityBookingService = createCrudService<
  AmenityBookingWithUser,
  CreateAmenityBookingDto,
  UpdateAmenityBookingDto
>("amenity_bookings", {
  parentColumn: "amenity_id",
  orderBy: "start_time",
  selectClause: "*, profiles:user_id(email)",
});
