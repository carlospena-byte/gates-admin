/**
 * Data fetching and mutations for ChargeManager — the top-level list of
 * recurring extra charges (e.g. "Seguridad"). Assigning a charge to units
 * happens on ChargeDetailPage, not here.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { chargeService } from "@/services";
import type { Charge, CreateChargeDto, UpdateChargeDto } from "@/types/unit-wizard.types";

export interface ChargeFormPayload {
  name: string;
  description: string;
}

export function useChargeManagerData(residentialId: string, open: boolean) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await chargeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setCharges(result.data);
    } else {
      toast.error(result.error.message);
    }
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
      };
      const result = await chargeService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create charge");
        return false;
      }

      toast.success("Charge created successfully");
      await reload();
      return true;
    },
    [residentialId, reload],
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

      toast.success("Charge updated successfully");
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

      toast.success("Charge deleted successfully");
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
        toast.error("Failed to toggle charge status");
      }
    },
    [reload],
  );

  return {
    charges,
    isLoading,
    isSubmitting,
    reload,
    createCharge,
    updateCharge,
    deleteCharge,
    toggleActive,
  };
}
