/**
 * Data + one-click actions behind the dashboard's Today inbox: payments with
 * a proof waiting for validation, open incidents, pending reservations and
 * visitors currently inside. Everything refreshes live.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import {
  accessLogService,
  amenitiesService,
  amenityBookingService,
  incidentService,
  inboxService,
  unitRentalPaymentService,
  unitService,
  visitorService,
  type PendingPayment,
  type PendingReservation,
} from "@/services";
import type { IncidentWithRelations } from "@/types/incident.types";
import type { VisitorWithInviter } from "@/types/visitor.types";

const LIVE_TABLES = ["unit_rental_payments", "incidents", "amenity_bookings", "visitors"] as const;

export function useTodayInbox(residentialId: string, currentUserId: string | undefined, enabled: boolean) {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [incidents, setIncidents] = useState<IncidentWithRelations[]>([]);
  const [reservations, setReservations] = useState<PendingReservation[]>([]);
  const [inside, setInside] = useState<VisitorWithInviter[]>([]);
  const [amenityNames, setAmenityNames] = useState<Record<string, string>>({});
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [paymentsRes, incidentsRes, reservationsRes, visitorsRes, amenitiesRes, unitsRes] = await Promise.all([
      inboxService.listPendingPayments(residentialId),
      incidentService.list(residentialId),
      inboxService.listPendingReservations(residentialId),
      visitorService.list(residentialId),
      amenitiesService.listByResidential(residentialId),
      unitService.listByResidential(residentialId),
    ]);

    if (paymentsRes.success) setPayments(paymentsRes.data);
    if (incidentsRes.success) {
      setIncidents(
        incidentsRes.data
          .filter((i) => i.status === "new" || i.status === "in_progress")
          .sort((a, b) => b.created_at.localeCompare(a.created_at)),
      );
    }
    if (reservationsRes.success) setReservations(reservationsRes.data);
    if (visitorsRes.success) setInside(visitorsRes.data.filter((v) => v.status === "inside"));
    if (amenitiesRes.success) setAmenityNames(Object.fromEntries(amenitiesRes.data.map((a) => [a.id, a.name])));
    if (unitsRes.success) setUnitNames(Object.fromEntries(unitsRes.data.map((u) => [u.id, u.name])));
    setIsLoading(false);
  }, [residentialId]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  useLiveRefresh(enabled ? residentialId : undefined, LIVE_TABLES, load);

  /** Runs a mutation with a per-row busy flag, toast feedback and a refresh. */
  const run = useCallback(
    async (id: string, successMessage: string, action: () => Promise<{ success: boolean; error?: { message: string } }>) => {
      setBusyId(id);
      const result = await action();
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error?.message ?? "Error");
        return;
      }
      toast.success(successMessage);
      await load();
    },
    [load],
  );

  const approvePayment = (id: string, message: string) =>
    run(id, message, () => unitRentalPaymentService.approve(id));
  const rejectPayment = (id: string, message: string, reason: string) =>
    run(id, message, () => unitRentalPaymentService.reject(id, reason));
  const viewProof = async (path: string): Promise<void> => {
    const result = await unitRentalPaymentService.getSignedProofUrl(path);
    if (result.success) window.open(result.data, "_blank", "noopener");
    else toast.error(result.error.message);
  };

  const takeIncident = (id: string, message: string) =>
    run(id, message, () =>
      incidentService.update(id, { status: "in_progress", assigned_to: currentUserId ?? null }),
    );
  const resolveIncident = (id: string, message: string) =>
    run(id, message, () =>
      incidentService.update(id, { status: "resolved", resolved_at: new Date().toISOString() }),
    );

  const confirmReservation = (id: string, message: string) =>
    run(id, message, () => amenityBookingService.update(id, { status: "confirmed" }));
  const declineReservation = (id: string, message: string, reason: string) =>
    run(id, message, () =>
      amenityBookingService.update(id, { status: "cancelled", rejection_reason: reason.trim() || null }),
    );

  const checkOutVisitor = (id: string, message: string) => run(id, message, () => accessLogService.checkOut(id));

  return {
    payments,
    incidents,
    reservations,
    inside,
    amenityNames,
    unitNames,
    isLoading,
    busyId,
    reload: load,
    approvePayment,
    rejectPayment,
    viewProof,
    takeIncident,
    resolveIncident,
    confirmReservation,
    declineReservation,
    checkOutVisitor,
  };
}
