import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import { getLocationOptionLabel } from "@/lib/locationHierarchy";
import type { Location, LocationTypeDefinition, CreateLocationDto } from "@/types/unit-wizard.types";

interface LocationCreateFormProps {
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isSubmitting: boolean;
  onCreate: (dto: Omit<CreateLocationDto, "residential_id">) => Promise<boolean>;
}

export function LocationCreateForm({
  locations,
  locationTypes,
  isSubmitting,
  onCreate,
}: LocationCreateFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [parentId, setParentId] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !type) return;

    const ok = await onCreate({
      name: name.trim(),
      type,
      parent_id: parentId || null,
    });

    if (ok) {
      setName("");
      setType("");
      setParentId("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Add New Location</label>
      <div className="space-y-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name (e.g., Tower A, Floor 3)"
          disabled={isSubmitting}
        />
        <Select value={type} onValueChange={setType} disabled={isSubmitting}>
          <SelectTrigger>
            <SelectValue placeholder="Select location type" />
          </SelectTrigger>
          <SelectContent>
            {locationTypes.length > 0 ? (
              locationTypes.map((t) => (
                <SelectItem key={t.id} value={t.code}>
                  {t.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No types available - Click "Manage Types" to add
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select
          value={parentId || "none"}
          onValueChange={(value) => setParentId(value === "none" ? "" : value)}
          disabled={isSubmitting}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select parent location (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (Root level)</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {getLocationOptionLabel(location, locations, locationTypes)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleCreate} disabled={isSubmitting || !name.trim() || !type} className="w-full">
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">Add Location</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
