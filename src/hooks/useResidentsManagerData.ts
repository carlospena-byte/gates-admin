/**
 * Data fetching and mutations for the residential-wide Residents page.
 * Same shape as useVisitorManagerData.ts: one residential-wide fetch,
 * plus the unit list for the "Add Resident" sheet's unit picker.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { unitResidentService, unitService, type UnitWithOwner } from "@/services";
import type { NewResidentFields } from "@/components/units/AddResidentSheet";
import type { ResidentWithUnit } from "@/types/unit-wizard.types";

export function useResidentsManagerData(residentialId: string) {
  const [residents, setResidents] = useState<ResidentWithUnit[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [residentsResult, unitsResult] = await Promise.all([
      unitResidentService.listByResidential(residentialId),
      unitService.listByResidential(residentialId),
    ]);

    setIsLoading(false);

    if (residentsResult.success) {
      setResidents(residentsResult.data);
    } else {
      toast.error(residentsResult.error.message);
    }

    if (unitsResult.success) setUnits(unitsResult.data);
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createResident = useCallback(
    async (fields: NewResidentFields): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitResidentService.create({
        unit_id: fields.unitId,
        residential_id: residentialId,
        full_name: fields.fullName.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim() || null,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Resident added");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const deleteResident = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitResidentService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Resident removed");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await unitResidentService.toggleActive(id, currentStatus);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await reload();
    },
    [reload],
  );

  return { residents, units, isLoading, isSubmitting, reload, createResident, deleteResident, toggleActive };
}
