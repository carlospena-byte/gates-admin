import { useCallback, useState } from "react";
import { unitService, type TablesUpdate, type TablesInsert } from "@/services";
import { useQuery } from "./useQuery";

/**
 * Hook for managing units list for a residential
 */
export function useUnits(residentialId: string | null) {
  const { data, error, isLoading, refetch } = useQuery(
    () => unitService.listByResidential(residentialId!),
    { enabled: !!residentialId },
  );

  return {
    units: data || [],
    error,
    isLoading,
    refetch,
  };
}

/**
 * Hook for managing a single unit
 */
export function useUnit(id: string | null) {
  const { data, error, isLoading, refetch } = useQuery(
    () => unitService.getById(id!),
    { enabled: !!id },
  );

  return {
    unit: data,
    error,
    isLoading,
    refetch,
  };
}

/**
 * Hook for unit mutations (create, update, delete)
 */
export function useUnitMutations() {
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const createUnit = useCallback(async (unit: TablesInsert<"units">) => {
    setIsMutating(true);
    setMutationError(null);

    const result = await unitService.create(unit);

    setIsMutating(false);

    if (!result.success) {
      setMutationError(result.error.message);
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }, []);

  const updateUnit = useCallback(async (id: string, updates: TablesUpdate<"units">) => {
    setIsMutating(true);
    setMutationError(null);

    const result = await unitService.update(id, updates);

    setIsMutating(false);

    if (!result.success) {
      setMutationError(result.error.message);
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
  }, []);

  const deleteUnit = useCallback(async (id: string) => {
    setIsMutating(true);
    setMutationError(null);

    const result = await unitService.delete(id);

    setIsMutating(false);

    if (!result.success) {
      setMutationError(result.error.message);
      return { success: false, error: result.error };
    }

    return { success: true };
  }, []);

  const toggleActive = useCallback(
    async (id: string, currentActive: boolean) => {
      return updateUnit(id, { is_active: !currentActive });
    },
    [updateUnit],
  );

  return {
    createUnit,
    updateUnit,
    deleteUnit,
    toggleActive,
    isMutating,
    mutationError,
  };
}
