import { useCallback, useState } from "react";
import { residentialService, type TablesUpdate } from "@/services";
import { useQuery } from "./useQuery";

/**
 * Hook for managing residentials list
 */
export function useResidentials() {
  const { data, error, isLoading, refetch } = useQuery(() => residentialService.list());

  return {
    residentials: data || [],
    error,
    isLoading,
    refetch,
  };
}

/**
 * Hook for managing a single residential
 */
export function useResidential(id: string | null) {
  const { data, error, isLoading, refetch } = useQuery(
    () => residentialService.getById(id!),
    { enabled: !!id },
  );

  return {
    residential: data,
    error,
    isLoading,
    refetch,
  };
}

/**
 * Hook for updating residential properties with optimistic updates
 */
export function useResidentialUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateResidential = useCallback(
    async (id: string, updates: TablesUpdate<"residentials">) => {
      setIsUpdating(true);
      setUpdateError(null);

      const result = await residentialService.update(id, updates);

      setIsUpdating(false);

      if (!result.success) {
        setUpdateError(result.error.message);
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    },
    [],
  );

  const toggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      return updateResidential(id, { is_active: !currentActive });
    },
    [updateResidential],
  );

  return {
    updateResidential,
    toggleActive,
    isUpdating,
    updateError,
  };
}
