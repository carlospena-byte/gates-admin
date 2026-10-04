/**
 * Data fetching and mutations for ChargeManager — the top-level list of
 * recurring monthly charges (e.g. "Seguridad"). Assigning a charge to units
 * happens on ChargeDetailPage, not here.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { chargeService } from "@/services";
import { navigateToChargeDetail } from "@/config/routes";
import type { Charge, CreateChargeDto, LateFeeRecurrence, UpdateChargeDto } from "@/types/unit-wizard.types";
import { translate } from "@/i18n/translate";

export interface ChargeFormPayload {
  name: string;
  description: string;
  amount: number;
}

export function useChargeManagerData(residentialId: string, open: boolean) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [lateFeeRecurrence, setLateFeeRecurrenceState] = useState<LateFeeRecurrence>("once");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const [result, countsResult, recurrenceResult] = await Promise.all([
      chargeService.list(residentialId),
      chargeService.unitCounts(residentialId),
      chargeService.getLateFeeRecurrence(residentialId),
    ]);
    setIsLoading(false);

    if (result.success) {
      setCharges(result.data);
    } else {
      toast.error(result.error.message);
    }
    if (countsResult.success) setUnitCounts(countsResult.data);
    if (recurrenceResult.success) setLateFeeRecurrenceState(recurrenceResult.data);
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const createCharge = useCallback(
    async (payload: ChargeFormPayload): Promise<boolean> => {
      setIsSubmitting(true);
      const dto: CreateChargeDto = {
        residential_id: residentialId,
        name: payload.name,
        description: payload.description || null,
        amount: payload.amount,
      };
      const result = await chargeService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create charge");
        return false;
      }

      toast.success(translate("toast.charge.created"));
      // Next step is choosing who pays it, which lives on the charge's page.
      navigateToChargeDetail(result.data.id);
      return true;
    },
    [residentialId],
  );

  const updateCharge = useCallback(
    async (id: string, dto: UpdateChargeDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeService.update(id, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update charge");
        return false;
      }

      toast.success(translate("toast.charge.updated"));
      await reload();
      return true;
    },
    [reload],
  );

  const deleteCharge = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete charge");
        return false;
      }

      toast.success(translate("toast.charge.deleted"));
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await chargeService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error(translate("toast.charge.toggleFailed"));
      }
    },
    [reload],
  );

  const setLateFeeRecurrence = useCallback(
    async (value: LateFeeRecurrence) => {
      const previous = lateFeeRecurrence;
      setLateFeeRecurrenceState(value);
      const result = await chargeService.setLateFeeRecurrence(residentialId, value);
      if (!result.success) {
        setLateFeeRecurrenceState(previous);
        toast.error(result.error.message);
      }
    },
    [residentialId, lateFeeRecurrence],
  );

  return {
    charges,
    unitCounts,
    lateFeeRecurrence,
    setLateFeeRecurrence,
    isLoading,
    isSubmitting,
    reload,
    createCharge,
    updateCharge,
    deleteCharge,
    toggleActive,
  };
}
