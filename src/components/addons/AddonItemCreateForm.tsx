import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import type { AddonItemFormPayload } from "@/hooks/useAddonItemManagerData";
import type { Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

interface AddonItemCreateFormProps {
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isSubmitting: boolean;
  onCreate: (payload: AddonItemFormPayload) => Promise<boolean>;
}

export function AddonItemCreateForm({
  locations,
  locationTypes,
  isSubmitting,
  onCreate,
}: AddonItemCreateFormProps) {
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [price, setPrice] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await onCreate({ name: name.trim(), locationId, price: price.trim() ? Number(price) : null });
    if (ok) {
      setName("");
      setLocationId("");
      setPrice("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Addon Item</label>
      <div className="space-y-2">
        <Input
          label="Item Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., P1 101"
          disabled={isSubmitting}
        />
        <Input
          label="Price (optional)"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="e.g., 50.00"
          disabled={isSubmitting}
        />
        <LocationCombobox
          locations={locations}
          locationTypes={locationTypes}
          value={locationId}
          onChange={setLocationId}
          disabled={isSubmitting}
        />
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()} className="w-full">
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">Add Item</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
