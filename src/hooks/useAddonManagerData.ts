/**
 * Data fetching and mutations for AddonManager. Unlike LocationManager,
 * there's a single reload used both on open and after every mutation
 * (matching the original's single loadData function).
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { addonService, addonTypeService } from "@/services";
import type { Addon, AddonType, UpdateAddonDto } from "@/types/unit-wizard.types";

export interface AddonFormPayload {
  name: string;
  addonTypeId: string;
}

export function useAddonManagerData(residentialId: string, open: boolean) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [addonsResult, typesResult] = await Promise.all([
      addonService.list(residentialId),
      addonTypeService.list(residentialId),
    ]);

    setIsLoading(false);

    if (addonsResult.success) {
      setAddons(addonsResult.data);
    } else {
      toast.error(addonsResult.error.message);
    }

    if (typesResult.success) {
      setAddonTypes(typesResult.data);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const createAddon = useCallback(
    async (payload: AddonFormPayload): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await addonService.create({
        residential_id: residentialId,
        addon_type_id: payload.addonTypeId,
        name: payload.name,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create addon");
        return false;
      }

      toast.success("Addon created successfully");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const updateAddon = useCallback(
    async (id: string, dto: UpdateAddonDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await addonService.update(id, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update addon");
        return false;
      }

      toast.success("Addon updated successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const deleteAddon = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await addonService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete addon");
        return false;
      }

      toast.success("Addon deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await addonService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle addon status");
      }
    },
    [reload],
  );

  return {
    addons,
    addonTypes,
    isLoading,
    isSubmitting,
    reload,
    createAddon,
    updateAddon,
    deleteAddon,
    toggleActive,
  };
}
