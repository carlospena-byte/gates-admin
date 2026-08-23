/**
 * Data fetching and mutations for BuildingFloorManager: buildings plus
 * their floors (loaded per-building into a Map), and the CRUD/toggle
 * handlers for both. Confirmation prompts stay in the presentational
 * layer; this hook only executes once told to.
 */

import { useCallback, useEffect, useState } from "react";
import { buildingService, floorService } from "@/services";
import type { Building, Floor } from "@/types/unit-wizard.types";

export function useBuildingFloorManagerData(residentialId: string, open: boolean) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState<Map<string, Floor[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const buildingsResult = await buildingService.list(residentialId);
    setIsLoading(false);

    if (!buildingsResult.success) {
      setError(buildingsResult.error.message);
      return;
    }

    setBuildings(buildingsResult.data);

    const floorsMap = new Map<string, Floor[]>();
    for (const building of buildingsResult.data) {
      const floorsResult = await floorService.listByBuilding(building.id);
      if (floorsResult.success) {
        floorsMap.set(building.id, floorsResult.data);
      }
    }
    setFloorsByBuilding(floorsMap);
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const createBuilding = useCallback(
    async (name: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await buildingService.create({ residential_id: residentialId, name });
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to create building");
        return false;
      }

      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const updateBuilding = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await buildingService.update(id, { name });
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to update building");
        return false;
      }

      await reload();
      return true;
    },
    [reload],
  );

  const deleteBuilding = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await buildingService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to delete building");
        return;
      }
      await reload();
    },
    [reload],
  );

  const toggleBuildingActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await buildingService.toggleActive(id, currentStatus);
      if (result.success) await reload();
    },
    [reload],
  );

  const createFloor = useCallback(
    async (buildingId: string, name: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await floorService.create({ building_id: buildingId, name });
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to create floor");
        return false;
      }

      await reload();
      return true;
    },
    [reload],
  );

  const updateFloor = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      setIsSubmitting(true);
      setSubmitError(null);

      const result = await floorService.update(id, { name });
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to update floor");
        return false;
      }

      await reload();
      return true;
    },
    [reload],
  );

  const deleteFloor = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      const result = await floorService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        setSubmitError(result.error?.message || "Failed to delete floor");
        return;
      }
      await reload();
    },
    [reload],
  );

  const toggleFloorActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await floorService.toggleActive(id, currentStatus);
      if (result.success) await reload();
    },
    [reload],
  );

  return {
    buildings,
    floorsByBuilding,
    isLoading,
    error,
    isSubmitting,
    submitError,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingActive,
    createFloor,
    updateFloor,
    deleteFloor,
    toggleFloorActive,
  };
}
