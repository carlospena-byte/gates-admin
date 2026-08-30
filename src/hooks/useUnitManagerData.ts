/**
 * Data fetching and mutations for UnitManager.
 * Keeps API orchestration (loading related entities, syncing addons,
 * reloading after a write) out of the presentational components.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  unitService,
  unitTypeService,
  locationService,
  locationTypeService,
  addonItemService,
  unitAddonService,
} from "@/services";
import type {
  UnitWithWizardData,
  UnitType,
  Location,
  LocationTypeDefinition,
  AddonItem,
} from "@/types/unit-wizard.types";

export interface UnitFormPayload {
  name: string;
  unitTypeId: string;
  locationId: string;
  addonItemIds: string[];
  price: number | null;
}

export function useUnitManagerData(residentialId: string, open: boolean, showList: boolean) {
  const [units, setUnits] = useState<UnitWithWizardData[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [typesResult, locationsResult, locationTypesResult, addonItemsResult] = await Promise.all([
      unitTypeService.list(residentialId),
      locationService.list(residentialId),
      locationTypeService.list(residentialId),
      addonItemService.listByResidential(residentialId),
    ]);

    const unitsResult = showList
      ? await unitService.listWithRelations(residentialId)
      : ({ success: true as const, data: [] as UnitWithWizardData[] });

    setIsLoading(false);

    if (showList) {
      if (unitsResult.success) {
        setUnits(unitsResult.data);
      } else {
        toast.error(unitsResult.error.message);
      }
    } else {
      setUnits([]);
    }

    if (typesResult.success) setUnitTypes(typesResult.data);
    if (locationsResult.success) setLocations(locationsResult.data);
    if (locationTypesResult.success) {
      setLocationTypes(locationTypesResult.data.filter((t) => t.is_active));
    }
    if (addonItemsResult.success) setAddonItems(addonItemsResult.data);
  }, [residentialId, showList]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const createUnit = useCallback(
    async (payload: UnitFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const unitResult = await unitService.create({
        residential_id: residentialId,
        name: payload.name,
        unit_type_id: payload.unitTypeId || null,
        location_id: payload.locationId || null,
        price: payload.price,
        is_active: true,
      });

      if (!unitResult.success) {
        setIsSubmitting(false);
        if (unitResult.error?.code === "23505") {
          toast.error("A unit with that name already exists");
        } else {
          toast.error(unitResult.error?.message || "Failed to create unit");
        }
        return false;
      }

      if (payload.addonItemIds.length > 0) {
        await unitAddonService.createMany(unitResult.data.id, payload.addonItemIds);
      }

      toast.success("Unit created successfully");
      await reload();
      setIsSubmitting(false);
      return true;
    },
    [residentialId, reload],
  );

  const updateUnit = useCallback(
    async (id: string, payload: UnitFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const updateResult = await unitService.update(id, {
        name: payload.name,
        unit_type_id: payload.unitTypeId || null,
        location_id: payload.locationId || null,
        price: payload.price,
      });

      if (!updateResult.success) {
        setIsSubmitting(false);
        toast.error(updateResult.error?.message || "Failed to update unit");
        return false;
      }

      await unitAddonService.deleteByUnitId(id);
      if (payload.addonItemIds.length > 0) {
        await unitAddonService.createMany(id, payload.addonItemIds);
      }

      toast.success("Unit updated successfully");
      await reload();
      setIsSubmitting(false);
      return true;
    },
    [reload],
  );

  const deleteUnit = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete unit");
        return false;
      }

      toast.success("Unit deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await unitService.update(id, { is_active: !currentStatus });
      if (!result.success) {
        toast.error("Failed to toggle unit status");
        return;
      }
      await reload();
    },
    [reload],
  );

  return {
    units,
    unitTypes,
    locations,
    locationTypes,
    addonItems,
    isLoading,
    isSubmitting,
    reload,
    createUnit,
    updateUnit,
    deleteUnit,
    toggleActive,
  };
}
