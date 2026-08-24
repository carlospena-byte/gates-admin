/**
 * Data fetching and mutations shared by AddonTypeManager and
 * UnitTypeManager: both are a flat "name + is_active" CRUD list scoped to a
 * residential, differing only in which service they call and their labels.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ApiResult } from "@/services";

export interface NamedTypeService<T> {
  list: (residentialId: string) => Promise<ApiResult<T[]>>;
  create: (dto: { residential_id: string; name: string }) => Promise<ApiResult<T>>;
  update: (id: string, dto: { name?: string; is_active?: boolean }) => Promise<ApiResult<T>>;
  delete: (id: string) => Promise<ApiResult<void>>;
  toggleActive: (id: string, currentStatus: boolean) => Promise<ApiResult<T>>;
}

/** e.g. "Addon Type" -> used in toasts as "Addon Type created successfully" / "Failed to create addon type" */
export function useNamedTypeManagerData<T extends { id: string }>(
  service: NamedTypeService<T>,
  residentialId: string,
  open: boolean,
  entityLabel: string,
  onTypesUpdated?: () => void,
) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lowerLabel = entityLabel.toLowerCase();

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await service.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setItems(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [service, residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await service.create({ residential_id: residentialId, name });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || `Failed to create ${lowerLabel}`);
        return false;
      }

      toast.success(`${entityLabel} created successfully`);
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [service, residentialId, reload, onTypesUpdated, entityLabel, lowerLabel],
  );

  const update = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await service.update(id, { name });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || `Failed to update ${lowerLabel}`);
        return false;
      }

      toast.success(`${entityLabel} updated successfully`);
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [service, reload, onTypesUpdated, entityLabel, lowerLabel],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await service.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || `Failed to delete ${lowerLabel}`);
        return false;
      }

      toast.success(`${entityLabel} deleted successfully`);
      await reload();
      onTypesUpdated?.();
      return true;
    },
    [service, reload, onTypesUpdated, entityLabel, lowerLabel],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await service.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
        onTypesUpdated?.();
      } else {
        toast.error(`Failed to toggle ${lowerLabel} status`);
      }
    },
    [service, reload, onTypesUpdated, lowerLabel],
  );

  return { items, isLoading, isSubmitting, create, update, remove, toggleActive };
}
