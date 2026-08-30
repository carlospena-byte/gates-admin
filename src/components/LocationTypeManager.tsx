/**
 * Location Type Manager
 * Mini CRUD for managing location type definitions.
 *
 * Thin container: data/mutations live in useLocationTypeManagerData, the
 * create form and table are self-contained components under
 * components/locationTypes/.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LocationTypeCreateForm } from "@/components/locationTypes/LocationTypeCreateForm";
import { LocationTypeTable } from "@/components/locationTypes/LocationTypeTable";
import { useLocationTypeManagerData } from "@/hooks/useLocationTypeManagerData";

export function LocationTypeSettingsPanel({
  residentialId,
  onTypesUpdated,
}: {
  residentialId: string;
  onTypesUpdated?: () => void;
}) {
  const { locationTypes, isLoading, isSubmitting, create, update, remove, toggleActive } =
    useLocationTypeManagerData(residentialId, true, onTypesUpdated);

  return (
    <div className="space-y-4">
      <LocationTypeCreateForm isSubmitting={isSubmitting} onCreate={create} />

      <LocationTypeTable
        locationTypes={locationTypes}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onUpdate={update}
        onDelete={remove}
        onToggleActive={toggleActive}
      />
    </div>
  );
}

interface LocationTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  onTypesUpdated?: () => void;
}

export function LocationTypeManager({
  open,
  onOpenChange,
  residentialId,
  onTypesUpdated,
}: LocationTypeManagerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Manage Location Types</SheetTitle>
          <SheetDescription>
            Define the types of locations available (e.g., Tower, Floor, Polygon)
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <LocationTypeSettingsPanel residentialId={residentialId} onTypesUpdated={onTypesUpdated} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
