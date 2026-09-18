/**
 * Data fetching and mutations for the Visitors page. Fetches the full
 * residential-wide visitor list once (same convention as every other
 * "Manager" hook) — VisitorsPage splits it into Today/Upcoming/Inside/
 * History tabs client-side.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { accessLogService, unitService, visitorService, type UnitWithOwner } from "@/services";
import type { CreateVisitorDto, VisitorWithInviter } from "@/types/visitor.types";

export interface VisitorFormPayload {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  validFrom: string;
  validUntil: string;
  invitedBy: string | null;
}

export function useVisitorManagerData(residentialId: string) {
  const [visitors, setVisitors] = useState<VisitorWithInviter[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [visitorsResult, unitsResult] = await Promise.all([
      visitorService.list(residentialId),
      unitService.listByResidential(residentialId),
    ]);

    setIsLoading(false);

    if (visitorsResult.success) {
      setVisitors(visitorsResult.data);
    } else {
      toast.error(visitorsResult.error.message);
    }

    if (unitsResult.success) setUnits(unitsResult.data);
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createVisitor = useCallback(
    async (payload: VisitorFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dto: CreateVisitorDto = {
        residential_id: residentialId,
        unit_id: payload.unitId || null,
        invited_by: payload.invitedBy,
        name: payload.name,
        phone: payload.phone || null,
        plate: payload.plate || null,
        valid_from: payload.validFrom,
        valid_until: payload.validUntil,
      };

      const result = await visitorService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Visitor scheduled");
      await reload();
      return true;
    },
    [residentialId, reload],
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
    isLoading,
    isSubmitting,
    reload,
    createVisitor,
    deleteVisitor,
    cancelVisitor,
    checkIn,
    checkOut,
  };
}
