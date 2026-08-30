/**
 * Data fetching and mutations for ChargeDetailPage — the charge's own
 * editable fields, plus bulk-assigning a price to a group of units (all,
 * by location, by unit type, or a manual pick) instead of one at a time.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  chargeService,
  unitChargeService,
  unitService,
  unitTypeService,
  locationService,
  locationTypeService,
} from "@/services";
import { getDescendantLocationIds } from "@/lib/locationHierarchy";
import type {
  Charge,
  Location,
  LocationTypeDefinition,
  UnitCharge,
  UnitType,
  UnitWithWizardData,
  UpdateChargeDto,
} from "@/types/unit-wizard.types";

export type AssignTarget =
  | { mode: "all" }
  | { mode: "location"; locationId: string }
  | { mode: "unitType"; unitTypeId: string }
  | { mode: "manual"; unitIds: string[] };

export function useChargeDetailData(residentialId: string, chargeId: string) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [assignments, setAssignments] = useState<UnitCharge[]>([]);
  const [units, setUnits] = useState<UnitWithWizardData[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [chargeResult, assignmentsResult, unitsResult, unitTypesResult, locationsResult, locationTypesResult] =
      await Promise.all([
        chargeService.getById(chargeId),
        unitChargeService.list(chargeId),
        unitService.listWithRelations(residentialId),
        unitTypeService.list(residentialId),
        locationService.list(residentialId),
        locationTypeService.list(residentialId),
      ]);

    setIsLoading(false);

    if (chargeResult.success) {
      setCharge(chargeResult.data);
    } else {
      toast.error(chargeResult.error?.message || "Failed to load charge");
    }

    if (assignmentsResult.success) {
      setAssignments(assignmentsResult.data);
    } else {
      toast.error(assignmentsResult.error?.message || "Failed to load assignments");
    }

    if (unitsResult.success) setUnits(unitsResult.data);
    if (unitTypesResult.success) setUnitTypes(unitTypesResult.data);
    if (locationsResult.success) setLocations(locationsResult.data);
    if (locationTypesResult.success) {
      setLocationTypes(locationTypesResult.data.filter((t) => t.is_active));
    }
  }, [residentialId, chargeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateCharge = useCallback(
    async (dto: UpdateChargeDto): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await chargeService.update(chargeId, dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update charge");
        return false;
      }

      toast.success("Charge updated successfully");
      await reload();
      return true;
    },
    [chargeId, reload],
  );

  /** Resolves an AssignTarget to the concrete list of unit ids it covers. */
  const resolveTargetUnitIds = useCallback(
    (target: AssignTarget): string[] => {
      switch (target.mode) {
        case "all":
          return units.filter((u) => u.is_active).map((u) => u.id);
        case "location": {
          const locationIds = new Set(getDescendantLocationIds(target.locationId, locations));
          return units.filter((u) => u.is_active && u.location_id && locationIds.has(u.location_id)).map((u) => u.id);
        }
        case "unitType":
          return units.filter((u) => u.is_active && u.unit_type_id === target.unitTypeId).map((u) => u.id);
        case "manual":
          return target.unitIds;
      }
    },
    [units, locations],
  );

  const bulkAssign = useCallback(
    async (target: AssignTarget, price: number): Promise<boolean> => {
      const unitIds = resolveTargetUnitIds(target);
      if (unitIds.length === 0) {
        toast.error("No units matched — nothing to assign");
        return false;
      }

      setIsSubmitting(true);
      const result = await unitChargeService.bulkAssign(residentialId, chargeId, unitIds, price);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to assign charge");
        return false;
      }

      toast.success(`Assigned to ${unitIds.length} unit${unitIds.length === 1 ? "" : "s"}`);
      await reload();
      return true;
    },
    [residentialId, chargeId, resolveTargetUnitIds, reload],
  );

  const removeAssignment = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await unitChargeService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to remove assignment");
        return false;
      }

      await reload();
      return true;
    },
    [reload],
  );

  const toggleAssignmentActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await unitChargeService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle assignment status");
      }
    },
    [reload],
  );

  return {
    charge,
    assignments,
    units,
    unitTypes,
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    reload,
    updateCharge,
    bulkAssign,
    removeAssignment,
    toggleAssignmentActive,
  };
}
