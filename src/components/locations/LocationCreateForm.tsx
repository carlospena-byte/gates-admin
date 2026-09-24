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
import { useI18n } from "@/i18n/useI18n";
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
  const { t } = useI18n();
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
      <label className="text-sm font-medium">{t("location.create.label")}</label>
      <div className="space-y-2">
        <Input
          label={t("location.create.nameLabel")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("location.create.namePlaceholder")}
          disabled={isSubmitting}
        />
        <Select value={type} onValueChange={setType} disabled={isSubmitting}>
          <SelectTrigger label={t("location.create.typeLabel")}>
            <SelectValue placeholder={t("location.create.typePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {sortedTypes.length > 0 ? (
              sortedTypes.map((locType) => (
                <SelectItem key={locType.id} value={locType.code}>
                  {locType.name} {t("location.create.levelSuffix", { level: locType.level })}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                {t("location.create.noTypesAvailable")}
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
            <SelectTrigger label={t("location.create.parentLabel")}>
              <SelectValue placeholder={t("location.create.parentPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                {eligibleParents.length > 0
                  ? t("location.create.selectParent")
                  : t("location.create.noEligibleParents")}
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
              <PlusIcon /> <span className="ml-2">{t("location.create.submit")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
