/**
 * Building & Floor Manager
 * Hierarchical management of buildings and their floors.
 *
 * Thin container: data/mutations live in useBuildingFloorManagerData, the
 * create-building form and the expandable building/floor list are
 * self-contained components under components/buildings/.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BuildingCreateForm } from "@/components/buildings/BuildingCreateForm";
import { BuildingFloorList } from "@/components/buildings/BuildingFloorList";
import { useBuildingFloorManagerData } from "@/hooks/useBuildingFloorManagerData";

interface BuildingFloorManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function BuildingFloorManager({ open, onOpenChange, residentialId }: BuildingFloorManagerProps) {
  const {
    buildings,
    floorsByBuilding,
    isLoading,
    error,
    isSubmitting,
    submitError,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    toggleBuildingActive,
    createFloor,
    updateFloor,
    deleteFloor,
    toggleFloorActive,
  } = useBuildingFloorManagerData(residentialId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Buildings & Floors</SheetTitle>
          <SheetDescription>
            Create and manage building structures and their floors/streets
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <BuildingCreateForm isSubmitting={isSubmitting} onCreate={createBuilding} />

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <BuildingFloorList
            buildings={buildings}
            floorsByBuilding={floorsByBuilding}
            isLoading={isLoading}
            error={error}
            isSubmitting={isSubmitting}
            onUpdateBuilding={updateBuilding}
            onDeleteBuilding={deleteBuilding}
            onToggleBuildingActive={toggleBuildingActive}
            onCreateFloor={createFloor}
            onUpdateFloor={updateFloor}
            onDeleteFloor={deleteFloor}
            onToggleFloorActive={toggleFloorActive}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
