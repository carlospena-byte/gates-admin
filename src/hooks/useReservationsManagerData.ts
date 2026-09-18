/**
 * Data fetching and mutations for the Reservations page. Loads the
 * residential's amenities once, then bookings for whichever amenity is
 * currently selected — same "reload on mount / on selection change"
 * convention as every other Manager hook.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { amenitiesService, amenityBookingService } from "@/services";
import type {
  Amenity,
  AmenityBookingWithUser,
  CreateAmenityBookingDto,
} from "@/types/amenities.types";

export interface ReservationFormPayload {
  amenityId: string;
  userId: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export function useReservationsManagerData(residentialId: string) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [selectedAmenityId, setSelectedAmenityId] = useState<string>("");
  const [bookings, setBookings] = useState<AmenityBookingWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAmenities = useCallback(async () => {
    const result = await amenitiesService.listByResidential(residentialId);
    if (result.success) {
      setAmenities(result.data);
      setSelectedAmenityId((current) => current || result.data[0]?.id || "");
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    void loadAmenities();
  }, [loadAmenities]);

  const loadBookings = useCallback(async () => {
    if (!selectedAmenityId) {
      setBookings([]);
      return;
    }
    setIsLoading(true);
    const result = await amenityBookingService.list(selectedAmenityId);
    setIsLoading(false);

    if (result.success) {
      setBookings(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [selectedAmenityId]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const createBooking = useCallback(
    async (payload: ReservationFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dto: CreateAmenityBookingDto = {
        amenity_id: payload.amenityId,
        residential_id: residentialId,
        user_id: payload.userId,
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
    await Promise.all([loadAmenities(), loadBookings()]);
  }, [loadAmenities, loadBookings]);

  return {
    amenities,
    selectedAmenityId,
    setSelectedAmenityId,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
  };
}
