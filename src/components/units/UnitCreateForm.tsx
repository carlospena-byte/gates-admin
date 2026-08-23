/**
 * "Add New Unit" form: owns its own draft state, including the cascading
 * parent/child location picker, and resets itself after a successful create.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "./icons";
import {
  getLocationFullPath,
  getParentLocationTypeOptions,
  getLocationTypeLabel,
  locationHasChildren,
} from "@/lib/locationHierarchy";
import type { UnitFormPayload } from "@/hooks/useUnitManagerData";
import type { UnitType, Location, LocationTypeDefinition, Addon } from "@/types/unit-wizard.types";

interface UnitCreateFormProps {
  unitTypes: UnitType[];
  locationTypes: LocationTypeDefinition[];
  locations: Location[];
  addons: Addon[];
  isSubmitting: boolean;
  onCreate: (payload: UnitFormPayload) => Promise<boolean>;
}

export function UnitCreateForm({
  unitTypes,
  locationTypes,
  locations,
  addons,
  isSubmitting,
  onCreate,
}: UnitCreateFormProps) {
  const [name, setName] = useState("");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [parentLocationType, setParentLocationType] = useState("");
  const [parentLocationId, setParentLocationId] = useState("");
  const [childLocationType, setChildLocationType] = useState("");
  const [locationId, setLocationId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);

  const parentLocationTypeOptions = useMemo(
    () => getParentLocationTypeOptions(locations, locationTypes),
    [locations, locationTypes],
  );

  const parentLocationsForSelectedType = useMemo(() => {
    if (!parentLocationType) return [];
    return locations
      .filter((l) => l.is_active && l.type === parentLocationType)
      .sort((a, b) => getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations)));
  }, [locations, parentLocationType]);

  const childLocationsForSelectedParent = useMemo(() => {
    if (!parentLocationId) return [];
    return locations.filter((l) => l.parent_id === parentLocationId);
  }, [locations, parentLocationId]);

  const childLocationTypeOptions = useMemo(() => {
    const codes = Array.from(new Set(childLocationsForSelectedParent.map((l) => l.type))).sort();
    return codes.map((code) => ({ code, name: getLocationTypeLabel(code, locationTypes) }));
  }, [childLocationsForSelectedParent, locationTypes]);

  // Location selection behavior:
  // - user picks a (parent) location first
  // - if that location has children, user must pick a child (leaf) location
  // - if it has no children, it is treated as the leaf location
  useEffect(() => {
    if (!parentLocationId) {
      setChildLocationType("");
      setLocationId("");
      return;
    }

    const hasChildren = locations.some((l) => l.parent_id === parentLocationId);
    if (hasChildren) {
      const children = locations.filter((l) => l.parent_id === parentLocationId);
      const childTypes = Array.from(new Set(children.map((l) => l.type))).sort();

      // If there's only one possible child type, auto-select it.
      setChildLocationType(childTypes.length === 1 ? childTypes[0] : "");
      setLocationId("");
      return;
    }

    setChildLocationType("");
    setLocationId(parentLocationId);
  }, [parentLocationId, locations]);

  const resetForm = () => {
    setName("");
    setUnitTypeId("");
    setParentLocationType("");
    setParentLocationId("");
    setChildLocationType("");
    setLocationId("");
    setAddonIds([]);
  };

  const handleAddonToggle = (addonId: string) => {
    setAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId],
    );
  };

  const isMissingLocation = !!parentLocationType && !parentLocationId;
  const isMissingChildLocation =
    !!parentLocationId && locationHasChildren(parentLocationId, locations) && (!childLocationType || !locationId);

  const handleCreate = async () => {
    if (!name.trim() || !unitTypeId) return;

    if (isMissingLocation) {
      toast.error("Select a location");
      return;
    }

    if (isMissingChildLocation) {
      toast.error("Select a sub-location");
      return;
    }

    const ok = await onCreate({
      name: name.trim(),
      unitTypeId,
      locationId,
      addonIds,
    });

    if (ok) resetForm();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Unit</label>
      <div className="space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Unit name (e.g., 101, A-203)"
          disabled={isSubmitting}
        />

        <Select
          value={unitTypeId}
          onValueChange={(value) => {
            setUnitTypeId(value);
            // Force the flow: pick a type first, then location.
            setParentLocationType("");
            setParentLocationId("");
            setChildLocationType("");
            setLocationId("");
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select unit type" />
          </SelectTrigger>
          <SelectContent>
            {unitTypes
              .filter((type) => type.is_active)
              .map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={parentLocationType || "none"}
          onValueChange={(value) => {
            const typeCode = value === "none" ? "" : value;
            setParentLocationType(typeCode);
            setParentLocationId("");
            setChildLocationType("");
            setLocationId("");
          }}
          disabled={isSubmitting || !unitTypeId}
        >
          <SelectTrigger>
            <SelectValue placeholder={unitTypeId ? "Select location type (optional)" : "Select unit type first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {parentLocationTypeOptions.map((t) => (
              <SelectItem key={t.code} value={t.code}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={parentLocationId || "none"}
          onValueChange={(value) => setParentLocationId(value === "none" ? "" : value)}
          disabled={isSubmitting || !unitTypeId || !parentLocationType}
        >
          <SelectTrigger>
            <SelectValue placeholder={parentLocationType ? "Select location" : "Select location type first"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {parentLocationsForSelectedType.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {getLocationFullPath(location, locations)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {parentLocationId && locationHasChildren(parentLocationId, locations) ? (
          <>
            <Select
              value={childLocationType || "none"}
              onValueChange={(value) => {
                const typeCode = value === "none" ? "" : value;
                setChildLocationType(typeCode);
                setLocationId("");
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select child location type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {childLocationTypeOptions.map((t) => (
                  <SelectItem key={t.code} value={t.code}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={locationId || "none"}
              onValueChange={(value) => setLocationId(value === "none" ? "" : value)}
              disabled={isSubmitting || !childLocationType}
            >
              <SelectTrigger>
                <SelectValue placeholder={childLocationType ? "Select child location" : "Select child type first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {childLocationsForSelectedParent
                  .filter((l) => l.type === childLocationType)
                  .sort((a, b) => getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations)))
                  .map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {getLocationFullPath(location, locations)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </>
        ) : null}

        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
          <label className="text-sm font-medium mb-2 block">Addons (optional)</label>
          {addons.filter((a) => a.is_active).length > 0 ? (
            addons
              .filter((a) => a.is_active)
              .map((addon) => (
                <div key={addon.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id={`addon-new-${addon.id}`}
                    checked={addonIds.includes(addon.id)}
                    onChange={() => handleAddonToggle(addon.id)}
                    disabled={isSubmitting}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`addon-new-${addon.id}`} className="text-sm cursor-pointer">
                    {addon.name} ({addon.addon_types?.name})
                  </label>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">No addons available</p>
          )}
        </div>

        <Button
          onClick={handleCreate}
          disabled={isSubmitting || !name.trim() || !unitTypeId || isMissingLocation || isMissingChildLocation}
          className="w-full"
        >
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">Add Unit</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
