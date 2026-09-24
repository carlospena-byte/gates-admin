/**
 * Location Manager
 * Side sheet for managing hierarchical locations CRUD
 * Supports: TOWER, FLOOR, POLYGON, PASAJE, STREET with parent-child relationships
 *
 * Thin container: data/mutations live in useLocationManagerData, the
 * create form and the existing-locations table are self-contained
 * components under components/locations/.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SettingsIcon } from "@/components/icons";
import { LocationCreateForm } from "@/components/locations/LocationCreateForm";
import { LocationTable } from "@/components/locations/LocationTable";
import { LocationTypeManager } from "@/components/LocationTypeManager";
import { useLocationManagerData } from "@/hooks/useLocationManagerData";
import { useI18n } from "@/i18n/useI18n";

export function LocationSettingsPanel({ residentialId }: { residentialId: string }) {
  const { t } = useI18n();
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  const {
    locations,
    locationTypes,
    isLoading,
    isSubmitting,
    reload,
    createLocation,
    updateLocation,
    deleteLocation,
    toggleActive,
  } = useLocationManagerData(residentialId, true);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setTypeManagerOpen(true)}>
          <SettingsIcon />
          <span className="ml-2">{t("location.manageTypes")}</span>
        </Button>
      </div>

      <LocationCreateForm
        locations={locations}
        locationTypes={locationTypes}
        isSubmitting={isSubmitting}
        onCreate={createLocation}
      />

      <LocationTable
        locations={locations}
        locationTypes={locationTypes}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onUpdate={updateLocation}
        onDelete={deleteLocation}
        onToggleActive={toggleActive}
      />

      <LocationTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={reload}
      />
    </div>
  );
}

interface LocationManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function LocationManager({ open, onOpenChange, residentialId }: LocationManagerProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{t("location.manager.title")}</SheetTitle>
          <SheetDescription>{t("location.manager.description")}</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <LocationSettingsPanel residentialId={residentialId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
