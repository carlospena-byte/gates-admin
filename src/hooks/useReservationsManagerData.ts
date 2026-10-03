/**
 * Data fetching and mutations for the Reservations page. Loads the
 * residential's amenities, units, and all its bookings (across every
 * amenity) up front — the amenity picker lives in the booking sheet, not
 * as a page-level filter.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  amenitiesService,
  amenityBookingService,
  billingService,
  locationService,
  unitResidentService,
  unitService,
} from "@/services";
import type {
  Amenity,
  AmenityBookingWithUser,
  CreateAmenityBookingDto,
} from "@/types/amenities.types";
import type { PaymentMethod } from "@/types/billing.types";
import type { UnitWithOwner } from "@/services/api.service";
import type { Location, ResidentWithStatus } from "@/types/unit-wizard.types";
import { translate } from "@/i18n/translate";

export interface ReservationFormPayload {
  amenityId: string;
  userId: string;
  unitId: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface ApprovalPayment {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  reference: string;
  createdBy: string | null;
}

export function useReservationsManagerData(residentialId: string) {
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [residents, setResidents] = useState<ResidentWithStatus[]>([]);
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

  const loadLocations = useCallback(async () => {
    const result = await locationService.list(residentialId);
    if (result.success) {
      setLocations(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  const loadResidents = useCallback(async () => {
    const result = await unitResidentService.listByResidentialWithStatus(residentialId);
    if (result.success) {
      setResidents(result.data);
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
    void loadLocations();
    void loadResidents();
    void loadBookings();
  }, [loadAmenities, loadUnits, loadLocations, loadResidents, loadBookings]);

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
          toast.error(translate("toast.reservation.slotTaken"));
        } else if (result.error.code === "AM001") {
          // Trigger rejection — the amenity has a blackout range covering
          // these dates (maintenance, board-only use, etc).
          toast.error(translate("toast.reservation.closed"));
        } else {
          toast.error(result.error.message);
        }
        return false;
      }

      toast.success(translate("toast.reservation.created"));
      await loadBookings();
      return true;
    },
    [residentialId, loadBookings],
  );

  const cancelBooking = useCallback(
    async (id: string, reason?: string) => {
      setIsSubmitting(true);
      const result = await amenityBookingService.update(id, {
        status: "cancelled",
        rejection_reason: reason?.trim() || null,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(translate("toast.reservation.cancelled"));
      await loadBookings();
    },
    [loadBookings],
  );

  /**
   * Approves a booking. Approval bills the unit (a DB trigger creates the
   * installment); when `payment` is given it is recorded against that
   * installment right away, which also pushes "payment verified" to the unit.
   */
  const approveBooking = useCallback(
    async (id: string, payment?: ApprovalPayment) => {
      setIsSubmitting(true);
      const result = await amenityBookingService.update(id, { status: "confirmed" });

      if (!result.success) {
        setIsSubmitting(false);
        toast.error(result.error.message);
        return;
      }

      let message = "Reservation approved";
      if (payment) {
        const charge = await billingService.getByBooking(id);
        if (!charge.success || !charge.data) {
          // Nothing to pay against: typically the booking has no resolvable unit.
          toast.warning(translate("toast.reservation.approvedNoCharge"));
          message = "";
        } else {
          const paid = await billingService.addPayments([
            {
              residential_id: residentialId,
              installment_id: charge.data.id,
              amount: payment.amount,
              paid_on: payment.paidOn,
              method: payment.method,
              reference: payment.reference || null,
              created_by: payment.createdBy,
            },
          ]);
          if (paid.success) message = "Reservation approved and payment recorded";
          else {
            toast.error(translate("toast.reservation.paymentFailed", { message: paid.error.message }));
            message = "";
          }
        }
      }
      setIsSubmitting(false);
      if (message) toast.success(message);
      await loadBookings();
    },
    [loadBookings, residentialId],
  );

  const updateBookingsStatus = useCallback(
    async (ids: string[], status: "confirmed" | "cancelled", reason?: string) => {
      if (ids.length === 0) return;
      setIsSubmitting(true);
      const results = await Promise.all(
        ids.map((id) =>
          amenityBookingService.update(id, {
            status,
            ...(status === "cancelled" ? { rejection_reason: reason?.trim() || null } : {}),
          }),
        ),
      );
      setIsSubmitting(false);

      const failures = results.filter((result) => !result.success);
      if (failures.length > 0) {
        toast.error(translate("toast.reservation.bulkFailed", { failed: failures.length, total: ids.length }));
      } else {
        toast.success(
          status === "confirmed"
            ? `${ids.length} reservation(s) approved`
            : `${ids.length} reservation(s) cancelled`,
        );
      }
      await loadBookings();
    },
    [loadBookings],
  );

  const reload = useCallback(async () => {
    await Promise.all([loadAmenities(), loadUnits(), loadLocations(), loadResidents(), loadBookings()]);
  }, [loadAmenities, loadUnits, loadLocations, loadResidents, loadBookings]);

  return {
    amenities,
    units,
    locations,
    residents,
    bookings,
    isLoading,
    isSubmitting,
    reload,
    createBooking,
    cancelBooking,
    approveBooking,
    updateBookingsStatus,
  };
}
