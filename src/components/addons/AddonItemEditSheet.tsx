import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { useI18n } from "@/i18n/useI18n";
import type { AddonItem, Location, LocationTypeDefinition, UpdateAddonItemDto } from "@/types/unit-wizard.types";

interface AddonItemEditSheetProps {
  item: AddonItem | null;
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, dto: UpdateAddonItemDto) => Promise<boolean>;
}

export function AddonItemEditSheet({
  item,
  locations,
  locationTypes,
  isSubmitting,
  onOpenChange,
  onSave,
}: AddonItemEditSheetProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setLocationId(item.location_id || "");
    setPrice(item.price !== null ? String(item.price) : "");
  }, [item]);

  const handleSave = async () => {
    if (!item || !name.trim()) return;
    const ok = await onSave(item.id, {
      name: name.trim(),
      location_id: locationId || null,
      price: price.trim() ? Number(price) : null,
    });
    if (ok) onOpenChange(false);
  };

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("addonItem.edit.title")}</SheetTitle>
          <SheetDescription>{t("addonItem.edit.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label={t("addonItem.create.nameLabel")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("addonItem.create.namePlaceholder")}
            disabled={isSubmitting}
          />
          <LocationCombobox
            locations={locations}
            locationTypes={locationTypes}
            value={locationId}
            onChange={setLocationId}
            disabled={isSubmitting}
          />
          <Input
            label={t("addonItem.create.priceLabel")}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={t("addonItem.create.pricePlaceholder")}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
