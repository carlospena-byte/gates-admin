/**
 * Building & Floor Manager
 * Hierarchical management of buildings and their floors
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { buildingService, floorService } from "@/services";
import type { Building, Floor } from "@/types/unit-wizard.types";

interface BuildingFloorManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function BuildingFloorManager({
  open,
  onOpenChange,
  residentialId,
}: BuildingFloorManagerProps) {
  // Manual state management for data fetching
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState<Map<string, Floor[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

  // Building form state
  const [newBuildingName, setNewBuildingName] = useState("");
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");

  // Floor form state
  const [newFloorName, setNewFloorName] = useState("");
  const [selectedBuildingForFloor, setSelectedBuildingForFloor] = useState<string | null>(null);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const buildingsResult = await buildingService.list(residentialId);
    setIsLoading(false);

    if (buildingsResult.success) {
      setBuildings(buildingsResult.data);

      // Load floors for each building
      const floorsMap = new Map<string, Floor[]>();
      for (const building of buildingsResult.data) {
        const floorsResult = await floorService.listByBuilding(building.id);
        if (floorsResult.success) {
          floorsMap.set(building.id, floorsResult.data);
        }
      }
      setFloorsByBuilding(floorsMap);
    } else {
      setError(buildingsResult.error.message);
    }
  }, [residentialId]);

  // Load data when sheet opens
  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, loadData]);

  const toggleBuildingExpanded = (buildingId: string) => {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  // Building handlers
  const handleCreateBuilding = async () => {
    if (!newBuildingName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await buildingService.create({
      residential_id: residentialId,
      name: newBuildingName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewBuildingName("");
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to create building");
    }
  };

  const handleUpdateBuilding = async (id: string) => {
    if (!editingBuildingName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await buildingService.update(id, {
      name: editingBuildingName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingBuildingId(null);
      setEditingBuildingName("");
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to update building");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all floors in this building.")) return;

    setIsSubmitting(true);
    const result = await buildingService.delete(id);
    setIsSubmitting(false);

    if (result.success) {
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to delete building");
    }
  };

  const handleToggleBuildingActive = async (id: string, currentStatus: boolean) => {
    const result = await buildingService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadData();
    }
  };

  // Floor handlers
  const handleCreateFloor = async (buildingId: string) => {
    if (!newFloorName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await floorService.create({
      building_id: buildingId,
      name: newFloorName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewFloorName("");
      setSelectedBuildingForFloor(null);
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to create floor");
    }
  };

  const handleUpdateFloor = async (id: string) => {
    if (!editingFloorName.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await floorService.update(id, {
      name: editingFloorName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingFloorId(null);
      setEditingFloorName("");
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to update floor");
    }
  };

  const handleDeleteFloor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this floor?")) return;

    setIsSubmitting(true);
    const result = await floorService.delete(id);
    setIsSubmitting(false);

    if (result.success) {
      await loadData();
    } else {
      setSubmitError(result.error?.message || "Failed to delete floor");
    }
  };

  const handleToggleFloorActive = async (id: string, currentStatus: boolean) => {
    const result = await floorService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadData();
    }
  };

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
          {/* Create Building Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Building</label>
            <div className="flex gap-2">
              <Input
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="e.g., Building A, Block 1..."
                onKeyDown={(e) => e.key === "Enter" && handleCreateBuilding()}
                disabled={isSubmitting}
              />
              <Button
                onClick={handleCreateBuilding}
                disabled={isSubmitting || !newBuildingName.trim()}
              >
                {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
              </Button>
            </div>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          {/* Buildings List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buildings & Floors</label>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : buildings && buildings.length > 0 ? (
              <div className="space-y-3">
                {buildings.map((building) => {
                  const isExpanded = expandedBuildings.has(building.id);
                  const floors = floorsByBuilding.get(building.id) || [];

                  return (
                    <div key={building.id} className="rounded-lg border bg-card">
                      {/* Building Row */}
                      <div className="flex items-center gap-2 p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleBuildingExpanded(building.id)}
                        >
                          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                        </Button>

                        {editingBuildingId === building.id ? (
                          <>
                            <Input
                              value={editingBuildingName}
                              onChange={(e) => setEditingBuildingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateBuilding(building.id);
                                if (e.key === "Escape") setEditingBuildingId(null);
                              }}
                              className="h-8 flex-1"
                              autoFocus
                              disabled={isSubmitting}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateBuilding(building.id)}
                              disabled={isSubmitting || !editingBuildingName.trim()}
                            >
                              {isSubmitting ? <Spinner size="sm" /> : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingBuildingId(null)}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{building.name}</span>
                                {!building.is_active && (
                                  <Badge variant="outline" className="text-xs">
                                    Inactive
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {floors.length} floor{floors.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                            </div>
                            <Switch
                              checked={building.is_active}
                              onCheckedChange={() =>
                                handleToggleBuildingActive(building.id, building.is_active)
                              }
                              disabled={isSubmitting}
                              aria-label={`Set ${building.name} ${building.is_active ? "inactive" : "active"}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingBuildingId(building.id);
                                setEditingBuildingName(building.name);
                              }}
                              disabled={isSubmitting}
                            >
                              <EditIcon />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteBuilding(building.id)}
                              disabled={isSubmitting}
                            >
                              <TrashIcon />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Floors Section (when expanded) */}
                      {isExpanded && (
                        <div className="border-t bg-muted/30 p-3 space-y-2">
                          {/* Add Floor Form */}
                          <div className="flex gap-2">
                            <Input
                              value={
                                selectedBuildingForFloor === building.id ? newFloorName : ""
                              }
                              onChange={(e) => {
                                setSelectedBuildingForFloor(building.id);
                                setNewFloorName(e.target.value);
                              }}
                              placeholder="Add floor (e.g., Floor 1, Street A...)"
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleCreateFloor(building.id)
                              }
                              className="h-8 text-sm"
                              disabled={isSubmitting}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleCreateFloor(building.id)}
                              disabled={
                                isSubmitting ||
                                !newFloorName.trim() ||
                                selectedBuildingForFloor !== building.id
                              }
                            >
                              <PlusIcon />
                            </Button>
                          </div>

                          {/* Floors List */}
                          {floors.length > 0 ? (
                            <div className="space-y-1">
                              {floors.map((floor) => (
                                <div
                                  key={floor.id}
                                  className="flex items-center gap-2 rounded bg-background p-2 text-sm"
                                >
                                  {editingFloorId === floor.id ? (
                                    <>
                                      <Input
                                        value={editingFloorName}
                                        onChange={(e) => setEditingFloorName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleUpdateFloor(floor.id);
                                          if (e.key === "Escape") setEditingFloorId(null);
                                        }}
                                        className="h-7 flex-1"
                                        autoFocus
                                        disabled={isSubmitting}
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateFloor(floor.id)}
                                        disabled={isSubmitting || !editingFloorName.trim()}
                                        className="h-7"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingFloorId(null)}
                                        disabled={isSubmitting}
                                        className="h-7"
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex-1 flex items-center gap-2 min-w-0">
                                        <span className="truncate">{floor.name}</span>
                                        {!floor.is_active && (
                                          <Badge variant="outline" className="text-xs">
                                            Inactive
                                          </Badge>
                                        )}
                                      </div>
                                      <Switch
                                        checked={floor.is_active}
                                        onCheckedChange={() =>
                                          handleToggleFloorActive(floor.id, floor.is_active)
                                        }
                                        disabled={isSubmitting}
                                        aria-label={`Set ${floor.name} ${floor.is_active ? "inactive" : "active"}`}
                                      />
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingFloorId(floor.id);
                                          setEditingFloorName(floor.name);
                                        }}
                                        disabled={isSubmitting}
                                        className="h-7 w-7 p-0"
                                      >
                                        <EditIcon />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteFloor(floor.id)}
                                        disabled={isSubmitting}
                                        className="h-7 w-7 p-0"
                                      >
                                        <TrashIcon />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-xs text-muted-foreground">
                              No floors yet. Add one above.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No buildings yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
