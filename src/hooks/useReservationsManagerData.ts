/**
 * Data fetching and mutations for the Reservations page. Loads the
 * residential's amenities, units, and all its bookings (across every
 * amenity) up front — the amenity picker lives in the booking sheet, not
 * as a page-level filter.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { amenitiesService, amenityBookingService, unitService } from "@/services";
import type {
  Amenity,
  AmenityBookingWithUser,
  CreateAmenityBookingDto,
} from "@/types/amenities.types";
import type { UnitWithOwner } from "@/services/api.service";

export interface ReservationFormPayload {
  amenityId: string;
  userId: string;
  unitId: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export function useReservationsManagerData(residentialId: string) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [bookings, setBookings] = useState<AmenityBookingWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAmenities = useCallback(async () => {
    const result = await amenitiesService.listByResidential(residentialId);
    if (result.success) {
      setAmenities(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  const loadUnits = useCallback(async () => {
    const result = await unitService.listByResidential(residentialId);
    if (result.success) {
      setUnits(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    const result = await amenityBookingService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setBookings(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    void loadAmenities();
    void loadUnits();
    void loadBookings();
  }, [loadAmenities, loadUnits, loadBookings]);

  const createBooking = useCallback(
    async (payload: ReservationFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dto: CreateAmenityBookingDto = {
        amenity_id: payload.amenityId,
        residential_id: residentialId,
        user_id: payload.userId,
        unit_id: payload.unitId,
        start_time: payload.startTime,
        end_time: payload.endTime,
        notes: payload.notes || null,
      };

      const result = await amenityBookingService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        // Postgres exclusion-constraint violation — the DB itself rejected
        // an overlapping time slot for this amenity.
        if (result.error.code === "23P01") {
          toast.error("This time slot is already booked for this amenity.");
        } else {
          toast.error(result.error.message);
        }
        return false;
      }

      toast.success("Reservation created");
      await loadBookings();
      return true;
    },
    [residentialId, loadBookings],
  );

  const cancelBooking = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await amenityBookingService.update(id, { status: "cancelled" });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Reservation cancelled");
      await loadBookings();
    },
    [loadBookings],
  );

  const reload = useCallback(async () => {
    await Promise.all([loadAmenities(), loadUnits(), loadBookings()]);
  }, [loadAmenities, loadUnits, loadBookings]);

  return {
    amenities,
    units,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
  };
}
