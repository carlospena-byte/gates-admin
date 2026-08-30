/**
 * Data fetching and mutations for AddonDetailPage — the addon's own
 * editable fields plus CRUD for its addon_items (the physical instances,
 * e.g. "P1 101").
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addonService,
  addonItemService,
  addonTypeService,
  locationService,
  locationTypeService,
} from "@/services";
import type {
  Addon,
  AddonItem,
  AddonType,
  Location,
  LocationTypeDefinition,
  UpdateAddonDto,
  UpdateAddonItemDto,
} from "@/types/unit-wizard.types";

export interface AddonItemFormPayload {
  name: string;
  locationId: string;
  price: number | null;
}

export function useAddonItemManagerData(residentialId: string, addonId: string) {
  const [addon, setAddon] = useState<Addon | null>(null);
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [items, setItems] = useState<AddonItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [addonResult, typesResult, itemsResult, locationsResult, locationTypesResult] = await Promise.all([
      addonService.getById(addonId),
      addonTypeService.list(residentialId),
      addonItemService.list(addonId),
      locationService.list(residentialId),
      locationTypeService.list(residentialId),
    ]);

    setIsLoading(false);

    if (addonResult.success) {
      setAddon(addonResult.data);
    } else {
      toast.error(addonResult.error?.message || "Failed to load addon");
    }

    if (typesResult.success) setAddonTypes(typesResult.data);
    if (itemsResult.success) {
      setItems(itemsResult.data);
    } else {
      toast.error(itemsResult.error?.message || "Failed to load addon items");
    }
    if (locationsResult.success) setLocations(locationsResult.data);
    if (locationTypesResult.success) {
      setLocationTypes(locationTypesResult.data.filter((t) => t.is_active));
    }
  }, [residentialId, addonId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateAddon = useCallback(
    async (dto: UpdateAddonDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await addonService.update(addonId, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update addon");
        return false;
      }

      toast.success("Addon updated successfully");
      await reload();
      return true;
    },
    [addonId, reload],
  );

  const createItem = useCallback(
    async (payload: AddonItemFormPayload): Promise<boolean> => {
      const isDuplicateName = items.some(
        (item) => item.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
      );
      if (isDuplicateName) {
        toast.warning(`Another item named "${payload.name}" already exists for this addon`);
      }

      setIsSubmitting(true);
      const result = await addonItemService.create({
        residential_id: residentialId,
        addon_id: addonId,
        location_id: payload.locationId || null,
        name: payload.name,
        price: payload.price,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create addon item");
        return false;
      }

      toast.success("Addon item created successfully");
      await reload();
      return true;
    },
    [residentialId, addonId, items, reload],
  );

  const updateItem = useCallback(
    async (id: string, dto: UpdateAddonItemDto): Promise<boolean> => {
      if (dto.name) {
        const isDuplicateName = items.some(
          (item) => item.id !== id && item.name.trim().toLowerCase() === dto.name!.trim().toLowerCase(),
        );
        if (isDuplicateName) {
          toast.warning(`Another item named "${dto.name}" already exists for this addon`);
        }
      }

      setIsSubmitting(true);
      const result = await addonItemService.update(id, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update addon item");
        return false;
      }

      toast.success("Addon item updated successfully");
      await reload();
      return true;
    },
    [items, reload],
  );

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await addonItemService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete addon item");
        return false;
      }

      toast.success("Addon item deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleItemActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await addonItemService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle addon item status");
      }
    },
    [reload],
  );

  return {
    addon,
    addonTypes,
    items,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    reload,
    updateAddon,
    createItem,
    updateItem,
    deleteItem,
    toggleItemActive,
  };
}
