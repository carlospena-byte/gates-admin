/**
 * Unit Manager
 * Side sheet for managing units CRUD with relationships.
 *
 * This is a thin container: data/mutations live in useUnitManagerData,
 * the create form and the existing-units table are self-contained
 * components under components/units/.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UnitCreateForm } from "@/components/units/UnitCreateForm";
import { UnitTable } from "@/components/units/UnitTable";
import { useUnitManagerData } from "@/hooks/useUnitManagerData";

interface UnitManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  showList?: boolean;
}

export function UnitManager({ open, onOpenChange, residentialId, showList = true }: UnitManagerProps) {
  const {
    units,
    unitTypes,
    locations,
    locationTypes,
    addons,
    isLoading,
    isSubmitting,
    createUnit,
    updateUnit,
    deleteUnit,
    toggleActive,
  } = useUnitManagerData(residentialId, open, showList);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Manage Units</SheetTitle>
          <SheetDescription>
            Create and manage residential units with types, locations, and addons
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <UnitCreateForm
            unitTypes={unitTypes}
            locationTypes={locationTypes}
            locations={locations}
            addons={addons}
            isSubmitting={isSubmitting}
            onCreate={createUnit}
          />

          {showList ? (
            <UnitTable
              units={units}
              unitTypes={unitTypes}
              locations={locations}
              addons={addons}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              onUpdate={updateUnit}
              onDelete={deleteUnit}
              onToggleActive={toggleActive}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
