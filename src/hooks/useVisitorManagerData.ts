/**
 * Data fetching and mutations for the Visitors page. Fetches the full
 * residential-wide visitor list once (same convention as every other
 * "Manager" hook) — VisitorsPage splits it into Today/Upcoming/Inside/
 * History tabs client-side.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { accessLogService, locationService, unitService, visitorService, type UnitWithOwner } from "@/services";
import type { Location } from "@/types/unit-wizard.types";
import type {
  CreateVisitorDto,
  NotificationChannel,
  ProviderKind,
  VisitorRole,
  VisitorWithInviter,
} from "@/types/visitor.types";

export interface FrequentVisitFormPayload {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  visitorRole: VisitorRole;
  notes: string;
  idPhoto: File | null;
  invitedBy: string | null;
}

export interface DeliveryVisitFormPayload {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  providerKind: ProviderKind;
  visitDate: string;
  notes: string;
  idPhoto: File | null;
  invitedBy: string | null;
}

export interface FastlaneVisitFormPayload {
  unitId: string;
  phone: string;
  visitDate: string;
  notes: string;
}

export function useVisitorManagerData(residentialId: string) {
  const [visitors, setVisitors] = useState<VisitorWithInviter[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [visitorsResult, unitsResult, locationsResult] = await Promise.all([
      visitorService.list(residentialId),
      unitService.listByResidential(residentialId),
      locationService.list(residentialId),
    ]);

    setIsLoading(false);

    if (visitorsResult.success) {
      setVisitors(visitorsResult.data);
    } else {
      toast.error(visitorsResult.error.message);
    }

    if (unitsResult.success) setUnits(unitsResult.data);
    if (locationsResult.success) setLocations(locationsResult.data);
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Uploads the optional ID photo for a just-created visit. The visit itself
   * already exists, so a failed upload only warns — the photo can still be
   * attached later from the table.
   */
  const attachIdPhoto = useCallback(
    async (visitorId: string, file: File | null) => {
      if (!file) return;
      const result = await visitorService.uploadIdPhoto({ residentialId, visitorId, file });
      if (!result.success) toast.error(result.error.message);
    },
    [residentialId],
  );

  const uploadIdPhoto = useCallback(
    async (visitorId: string, file: File): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await visitorService.uploadIdPhoto({ residentialId, visitorId, file });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Document photo saved");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const createFrequentVisit = useCallback(
    async (payload: FrequentVisitFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const now = new Date();
      const dto: CreateVisitorDto = {
        residential_id: residentialId,
        unit_id: payload.unitId || null,
        invited_by: payload.invitedBy,
        name: payload.name,
        phone: payload.phone || null,
        plate: payload.plate || null,
        // Admin-registered visits start now (entry time = creation time)
        // and end when the admin registers the exit (check-out).
        valid_from: now.toISOString(),
        valid_until: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString(),
        visit_type: "frequent",
        visitor_role: payload.visitorRole,
        notes: payload.notes || null,
      };

      const result = await visitorService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      await attachIdPhoto(result.data.id, payload.idPhoto);

      // Entry is logged at creation time, so the visit starts "inside".
      const checkInResult = await accessLogService.checkIn(result.data.id, residentialId);
      if (!checkInResult.success) toast.error(checkInResult.error.message);

      toast.success("Visit registered");
      await reload();
      return true;
    },
    [residentialId, reload, attachIdPhoto],
  );

  const createDeliveryVisit = useCallback(
    async (payload: DeliveryVisitFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dayStart = new Date(`${payload.visitDate}T00:00:00`);
      const dayEnd = new Date(`${payload.visitDate}T23:59:59`);

      const dto: CreateVisitorDto = {
        residential_id: residentialId,
        unit_id: payload.unitId || null,
        invited_by: payload.invitedBy,
        name: payload.name,
        phone: payload.phone || null,
        plate: payload.plate || null,
        valid_from: dayStart.toISOString(),
        valid_until: dayEnd.toISOString(),
        visit_type: "delivery",
        provider_kind: payload.providerKind,
        notes: payload.notes || null,
      };

      const result = await visitorService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      await attachIdPhoto(result.data.id, payload.idPhoto);
      toast.success("Delivery visit scheduled");
      await reload();
      return true;
    },
    [residentialId, reload, attachIdPhoto],
  );

  const createFastlaneVisit = useCallback(
    async (payload: FastlaneVisitFormPayload): Promise<VisitorWithInviter | null> => {
      setIsSubmitting(true);

      const result = await visitorService.createFastlane({
        residentialId,
        unitId: payload.unitId,
        phone: payload.phone,
        visitDate: payload.visitDate,
        notes: payload.notes || null,
      });

      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return null;
      }

      await reload();
      return result.data;
    },
    [residentialId, reload],
  );

  const sendFastlaneNotification = useCallback(
    async (visitId: string, channel: NotificationChannel) => {
      const result = await visitorService.sendNotification({ visitId, channel });
      if (!result.success) {
        return { notificationSent: false, error: result.error.message };
      }
      return result.data;
    },
    [],
  );

  const deleteVisitor = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await visitorService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Visitor removed");
      await reload();
      return true;
    },
    [reload],
  );

  const cancelVisitor = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await visitorService.update(id, { status: "cancelled" });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      toast.success("Visit cancelled");
      await reload();
    },
    [reload],
  );

  const checkIn = useCallback(
    async (visitorId: string) => {
      const result = await accessLogService.checkIn(visitorId, residentialId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Visitor checked in");
      await reload();
    },
    [residentialId, reload],
  );

  const checkOut = useCallback(
    async (visitorId: string) => {
      const result = await accessLogService.checkOut(visitorId);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Visitor checked out");
      await reload();
    },
    [reload],
  );

  return {
    visitors,
    units,
    locations,
    isLoading,
    isSubmitting,
    reload,
    createFrequentVisit,
    createDeliveryVisit,
    createFastlaneVisit,
    sendFastlaneNotification,
    deleteVisitor,
    cancelVisitor,
    uploadIdPhoto,
    checkIn,
    checkOut,
  };
}
