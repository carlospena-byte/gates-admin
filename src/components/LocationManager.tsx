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

interface LocationManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function LocationManager({ open, onOpenChange, residentialId }: LocationManagerProps) {
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
  } = useLocationManagerData(residentialId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Manage Locations</SheetTitle>
              <SheetDescription>Create and manage hierarchical locations</SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTypeManagerOpen(true)}>
              <SettingsIcon />
              <span className="ml-2">Manage Types</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 py-6">
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
            open={open}
            onUpdate={updateLocation}
            onDelete={deleteLocation}
            onToggleActive={toggleActive}
          />
        </div>
      </SheetContent>

      <LocationTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={reload}
      />
    </Sheet>
  );
}
