import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon } from "@/components/icons";
import {
  getEligibleParentLocations,
  getLocationFullPath,
  sortLocationTypesByLevel,
  typeRequiresParent,
} from "@/lib/locationHierarchy";
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

  // Types are picked mayor -> menor: level 1 first (e.g. Edificio, Bloque),
  // then level 2 (e.g. Piso, Polígono), etc.
  const sortedTypes = useMemo(() => sortLocationTypesByLevel(locationTypes), [locationTypes]);

  const needsParent = typeRequiresParent(type, locationTypes);

  const eligibleParents = useMemo(
    () => getEligibleParentLocations(type, locations, locationTypes),
    [type, locations, locationTypes],
  );

  // Changing the type can invalidate the previously selected parent (wrong level).
  useEffect(() => {
    setParentId("");
  }, [type]);

  const isMissingParent = needsParent && !parentId;

  const handleCreate = async () => {
    if (!name.trim() || !type || isMissingParent) return;

    const ok = await onCreate({
      name: name.trim(),
      type,
      parent_id: needsParent ? parentId : null,
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
          label="Location Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Edificio A, Piso 3"
          disabled={isSubmitting}
        />
        <Select value={type} onValueChange={setType} disabled={isSubmitting}>
          <SelectTrigger label="Location Type">
            <SelectValue placeholder="Select location type" />
          </SelectTrigger>
          <SelectContent>
            {sortedTypes.length > 0 ? (
              sortedTypes.map((t) => (
                <SelectItem key={t.id} value={t.code}>
                  {t.name} (Nivel {t.level})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No types available - Click "Manage Types" to add
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {needsParent ? (
          <Select
            value={parentId || "none"}
            onValueChange={(value) => setParentId(value === "none" ? "" : value)}
            disabled={isSubmitting}
          >
            <SelectTrigger label="Parent Location">
              <SelectValue placeholder="Select parent location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                {eligibleParents.length > 0 ? "Select a parent" : "No eligible parent locations yet"}
              </SelectItem>
              {eligibleParents.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {getLocationFullPath(location, locations)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button
          onClick={handleCreate}
          disabled={isSubmitting || !name.trim() || !type || isMissingParent}
          className="w-full"
        >
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
