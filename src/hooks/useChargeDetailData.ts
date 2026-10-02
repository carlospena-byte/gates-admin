/**
 * Data fetching and mutations for ChargeDetailPage — the charge's own billing
 * fields plus its assignment rules (location + descendants, one location only,
 * or one exact unit), and manual generation of this month's installments.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  chargeService,
  chargeAssignmentService,
  unitService,
  locationService,
  locationTypeService,
} from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type {
  Charge,
  ChargeAssignment,
  CreateChargeAssignmentDto,
  Location,
  LocationTypeDefinition,
  UnitWithWizardData,
  UpdateChargeDto,
} from "@/types/unit-wizard.types";

export function useChargeDetailData(residentialId: string, chargeId: string) {
  const { t } = useI18n();
  const [charge, setCharge] = useState<Charge | null>(null);
  const [assignments, setAssignments] = useState<ChargeAssignment[]>([]);
  const [unitCount, setUnitCount] = useState(0);
  const [units, setUnits] = useState<UnitWithWizardData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [chargeResult, assignmentsResult, countsResult, unitsResult, locationsResult, locationTypesResult] =
      await Promise.all([
        chargeService.getById(chargeId),
        chargeAssignmentService.list(chargeId),
        chargeService.unitCounts(residentialId),
        unitService.listWithRelations(residentialId),
        locationService.list(residentialId),
        locationTypeService.list(residentialId),
      ]);

    setIsLoading(false);

    if (chargeResult.success) {
      setCharge(chargeResult.data);
    } else {
      toast.error(chargeResult.error?.message || t("charges.detail.loadFailed"));
    }

    if (assignmentsResult.success) {
      setAssignments(assignmentsResult.data);
    } else {
      toast.error(assignmentsResult.error?.message || t("charges.detail.loadFailed"));
    }

    if (countsResult.success) setUnitCount(countsResult.data[chargeId] ?? 0);
    if (unitsResult.success) setUnits(unitsResult.data);
    if (locationsResult.success) setLocations(locationsResult.data);
    if (locationTypesResult.success) {
      setLocationTypes(locationTypesResult.data.filter((lt) => lt.is_active));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentialId, chargeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateCharge = useCallback(
    async (dto: UpdateChargeDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeService.update(chargeId, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || t("charges.detail.saveFailed"));
        return false;
      }

      toast.success(t("charges.detail.saved"));
      await reload();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chargeId, reload],
  );

  const addAssignment = useCallback(
    async (dto: Omit<CreateChargeAssignmentDto, "residential_id" | "charge_id">): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeAssignmentService.create({
        ...dto,
        residential_id: residentialId,
        charge_id: chargeId,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || t("charges.detail.ruleFailed"));
        return false;
      }

      await reload();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [residentialId, chargeId, reload],
  );

  const removeAssignment = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeAssignmentService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || t("charges.detail.ruleFailed"));
        return false;
      }

      await reload();
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reload],
  );

  const toggleAssignmentActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await chargeAssignmentService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error(t("charges.detail.ruleFailed"));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reload],
  );

  /** Creates this month's missing installments for the charge. */
  const generateThisMonth = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    const result = await chargeService.generateInstallments(
      residentialId,
      new Date().toISOString().slice(0, 10),
      chargeId,
    );
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error?.message || t("charges.detail.generateFailed"));
      return;
    }

    toast.success(t("charges.detail.generated", { count: result.data }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentialId, chargeId]);

  return {
    charge,
    assignments,
    unitCount,
    units,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    reload,
    updateCharge,
    addAssignment,
    removeAssignment,
    toggleAssignmentActive,
    generateThisMonth,
  };
}
