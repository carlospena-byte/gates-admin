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
import { AddonItemPicker } from "@/components/units/AddonItemPicker";
import { useI18n } from "@/i18n/useI18n";
import type { UnitFormPayload } from "@/hooks/useUnitManagerData";
import type { UnitType, Location, LocationTypeDefinition, AddonItem, AddonType } from "@/types/unit-wizard.types";

interface UnitCreateFormProps {
  unitTypes: UnitType[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  addonItems: AddonItem[];
  addonTypes: AddonType[];
  isSubmitting: boolean;
  onCreate: (payload: UnitFormPayload) => Promise<boolean>;
}

export function UnitCreateForm({
  unitTypes,
  locations,
  locationTypes,
  addonItems,
  addonTypes,
  isSubmitting,
  onCreate,
}: UnitCreateFormProps) {
  const { t } = useI18n();
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
      <label className="text-sm font-medium">{t("units.create.title")}</label>
      <div className="space-y-2">
        <Input
          label={t("units.create.fields.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("units.create.fields.namePlaceholder")}
          disabled={isSubmitting}
        />

        <Select value={unitTypeId} onValueChange={setUnitTypeId} disabled={isSubmitting}>
          <SelectTrigger label={t("units.create.fields.type")}>
            <SelectValue placeholder={t("units.create.fields.typePlaceholder")} />
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
          label={t("units.create.fields.price")}
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={t("units.create.fields.pricePlaceholder")}
          disabled={isSubmitting}
        />

        <AddonItemPicker
          addonItems={addonItems}
          addonTypes={addonTypes}
          locations={locations}
          locationTypes={locationTypes}
          selectedIds={addonItemIds}
          onToggle={handleAddonToggle}
          onSetSelected={setAddonItemIds}
          disabled={isSubmitting}
        />

        <Button
          onClick={handleCreate}
          disabled={isSubmitting || !name.trim() || !unitTypeId}
          className="w-full"
        >
          {isSubmitting ? (
            <Spinner size="sm" />
          ) : (
            <>
              <PlusIcon /> <span className="ml-2">{t("units.create.submit")}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
