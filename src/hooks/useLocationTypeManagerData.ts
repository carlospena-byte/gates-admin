/**
 * Data fetching and mutations for LocationTypeManager. Unlike the other
 * type managers this one has two fields (name + code) and no pagination.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { locationTypeService } from "@/services";
import type { LocationTypeDefinition } from "@/types/unit-wizard.types";

export function useLocationTypeManagerData(
  residentialId: string,
  open: boolean,
  onTypesUpdated?: () => void,
) {
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await locationTypeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setLocationTypes(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const create = useCallback(
    async (name: string, code: string, level: number): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationTypeService.create({
        residential_id: residentialId,
        name,
        code: code.toUpperCase(),
        level,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create location type");
        return false;
      }

      toast.success("Location type created successfully");
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [residentialId, reload, onTypesUpdated],
  );

  const update = useCallback(
    async (id: string, name: string, code: string, level: number): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationTypeService.update(id, { name, code: code.toUpperCase(), level });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update location type");
        return false;
      }

      toast.success("Location type updated successfully");
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [reload, onTypesUpdated],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationTypeService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete location type");
        return false;
      }

      toast.success("Location type deleted successfully");
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [reload, onTypesUpdated],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await locationTypeService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
        onTypesUpdated?.();
      } else {
        toast.error("Failed to toggle location type status");
      }
    },
    [reload, onTypesUpdated],
  );

  return { locationTypes, isLoading, isSubmitting, create, update, remove, toggleActive };
}
