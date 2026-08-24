/**
 * Data fetching and mutations for LocationManager.
 *
 * Mirrors the original split between a "full" reload (locations + types,
 * used when the sheet opens or location types change) and a lighter
 * locations-only reload used after a location CRUD mutation.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { locationService, locationTypeService } from "@/services";
import type { Location, LocationTypeDefinition, CreateLocationDto, UpdateLocationDto } from "@/types/unit-wizard.types";

export function useLocationManagerData(residentialId: string, open: boolean) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const [locationsResult, typesResult] = await Promise.all([
      locationService.list(residentialId),
      locationTypeService.list(residentialId),
    ]);
    setIsLoading(false);

    if (locationsResult.success) {
      setLocations(locationsResult.data);
    } else {
      toast.error(locationsResult.error.message);
    }

    if (typesResult.success) {
      setLocationTypes(typesResult.data.filter((t) => t.is_active));
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const reloadLocations = useCallback(async () => {
    const result = await locationService.list(residentialId);
    if (result.success) setLocations(result.data);
  }, [residentialId]);

  const createLocation = useCallback(
    async (dto: Omit<CreateLocationDto, "residential_id">): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationService.create({ ...dto, residential_id: residentialId });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create location");
        return false;
      }

      toast.success("Location created successfully");
      await reloadLocations();
      return true;
    },
    [residentialId, reloadLocations],
  );

  const updateLocation = useCallback(
    async (id: string, dto: UpdateLocationDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationService.update(id, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update location");
        return false;
      }

      toast.success("Location updated successfully");
      await reloadLocations();
      return true;
    },
    [reloadLocations],
  );

  const deleteLocation = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await locationService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete location");
        return false;
      }

      toast.success("Location deleted successfully");
      await reloadLocations();
      return true;
    },
    [reloadLocations],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await locationService.toggleActive(id, currentStatus);
      if (result.success) {
        await reloadLocations();
      } else {
        toast.error("Failed to toggle location status");
      }
    },
    [reloadLocations],
  );

  return {
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    reload,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleActive,
  };
}
