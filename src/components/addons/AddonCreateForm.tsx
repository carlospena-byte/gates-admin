import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import type { AddonFormPayload } from "@/hooks/useAddonManagerData";
import type { AddonType } from "@/types/unit-wizard.types";

interface AddonCreateFormProps {
  addonTypes: AddonType[];
  isSubmitting: boolean;
  onCreate: (payload: AddonFormPayload) => Promise<boolean>;
}

export function AddonCreateForm({ addonTypes, isSubmitting, onCreate }: AddonCreateFormProps) {
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !typeId) return;
    const ok = await onCreate({ name: name.trim(), addonTypeId: typeId });
    if (ok) {
      setName("");
      setTypeId("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Addon</label>
      <div className="space-y-2">
        <Input
          label="Addon Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Covered Parking, Storage Unit..."
          disabled={isSubmitting}
        />
        <Select value={typeId} onValueChange={setTypeId} disabled={isSubmitting}>
          <SelectTrigger label="Addon Type">
            <SelectValue placeholder="Select addon type" />
          </SelectTrigger>
          <SelectContent>
            {addonTypes.filter((type) => type.is_active).length > 0 ? (
              addonTypes
                .filter((type) => type.is_active)
                .map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))
            ) : (
              <SelectItem value="none" disabled>
                No types available - Click "Manage Types" to add
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !typeId} className="w-full">
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">Add Addon</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
