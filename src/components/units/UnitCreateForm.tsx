/**
 * "Add New Unit" form: owns its own draft state and resets itself after a
 * successful create.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import type { UnitFormPayload } from "@/hooks/useUnitManagerData";
import type { UnitType, Location, LocationTypeDefinition, AddonItem } from "@/types/unit-wizard.types";

interface UnitCreateFormProps {
  unitTypes: UnitType[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  addonItems: AddonItem[];
  isSubmitting: boolean;
  onCreate: (payload: UnitFormPayload) => Promise<boolean>;
}

export function UnitCreateForm({
  unitTypes,
  locations,
  locationTypes,
  addonItems,
  isSubmitting,
  onCreate,
}: UnitCreateFormProps) {
  const [name, setName] = useState("");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [addonItemIds, setAddonItemIds] = useState<string[]>([]);
  const [price, setPrice] = useState("");

  const resetForm = () => {
    setName("");
    setUnitTypeId("");
    setLocationId("");
    setAddonItemIds([]);
    setPrice("");
  };

  const handleAddonToggle = (addonItemId: string) => {
    setAddonItemIds((prev) =>
      prev.includes(addonItemId) ? prev.filter((id) => id !== addonItemId) : [...prev, addonItemId],
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !unitTypeId) return;

    const ok = await onCreate({
      name: name.trim(),
      unitTypeId,
      locationId,
      addonItemIds,
      price: price.trim() ? Number(price) : null,
    });

    if (ok) resetForm();
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Unit</label>
      <div className="space-y-2">
        <Input
          label="Unit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., 101, A-203"
          disabled={isSubmitting}
        />

        <Select value={unitTypeId} onValueChange={setUnitTypeId} disabled={isSubmitting}>
          <SelectTrigger label="Unit Type">
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

        <LocationCombobox
          locations={locations}
          locationTypes={locationTypes}
          value={locationId}
          onChange={setLocationId}
          disabled={isSubmitting}
        />

        <Input
          label="Price (optional)"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 500.00"
          disabled={isSubmitting}
        />

        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
          <label className="text-sm font-medium mb-2 block">Addons (optional)</label>
          {addonItems.filter((a) => a.is_active).length > 0 ? (
            addonItems
              .filter((a) => a.is_active)
              .map((item) => (
                <div key={item.id} className="flex items-center space-x-2 py-1">
                  <input
                    type="checkbox"
                    id={`addon-item-new-${item.id}`}
                    checked={addonItemIds.includes(item.id)}
                    onChange={() => handleAddonToggle(item.id)}
                    disabled={isSubmitting}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`addon-item-new-${item.id}`} className="text-sm cursor-pointer">
                    {item.addons?.name} — {item.name}
                    {item.locations && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({getLocationFullPath(item.locations, locations)})
                      </span>
                    )}
                  </label>
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">No addons available</p>
          )}
        </div>

        <Button
          onClick={handleCreate}
          disabled={isSubmitting || !name.trim() || !unitTypeId}
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
