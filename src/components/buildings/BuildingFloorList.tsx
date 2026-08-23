/**
 * Expandable buildings list with their nested floors: inline editing for
 * both, plus a "add floor" form scoped to whichever building row is
 * expanded and being added to.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon, TrashIcon, EditIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import type { Building, Floor } from "@/types/unit-wizard.types";

interface BuildingFloorListProps {
  buildings: Building[];
  floorsByBuilding: Map<string, Floor[]>;
  isLoading: boolean;
  error: string | null;
  isSubmitting: boolean;
  onUpdateBuilding: (id: string, name: string) => Promise<boolean>;
  onDeleteBuilding: (id: string) => Promise<void>;
  onToggleBuildingActive: (id: string, currentStatus: boolean) => Promise<void>;
  onCreateFloor: (buildingId: string, name: string) => Promise<boolean>;
  onUpdateFloor: (id: string, name: string) => Promise<boolean>;
  onDeleteFloor: (id: string) => Promise<void>;
  onToggleFloorActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function BuildingFloorList({
  buildings,
  floorsByBuilding,
  isLoading,
  error,
  isSubmitting,
  onUpdateBuilding,
  onDeleteBuilding,
  onToggleBuildingActive,
  onCreateFloor,
  onUpdateFloor,
  onDeleteFloor,
  onToggleFloorActive,
}: BuildingFloorListProps) {
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());

  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");

  const [newFloorName, setNewFloorName] = useState("");
  const [selectedBuildingForFloor, setSelectedBuildingForFloor] = useState<string | null>(null);
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingFloorName, setEditingFloorName] = useState("");

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

  const handleUpdateBuilding = async (id: string) => {
    if (!editingBuildingName.trim()) return;
    const ok = await onUpdateBuilding(id, editingBuildingName.trim());
    if (ok) {
      setEditingBuildingId(null);
      setEditingBuildingName("");
    }
  };

  const handleDeleteBuilding = (id: string) => {
    if (!confirm("Are you sure? This will also delete all floors in this building.")) return;
    void onDeleteBuilding(id);
  };

  const handleCreateFloor = async (buildingId: string) => {
    if (!newFloorName.trim()) return;
    const ok = await onCreateFloor(buildingId, newFloorName.trim());
    if (ok) {
      setNewFloorName("");
      setSelectedBuildingForFloor(null);
    }
  };

  const handleUpdateFloor = async (id: string) => {
    if (!editingFloorName.trim()) return;
    const ok = await onUpdateFloor(id, editingFloorName.trim());
    if (ok) {
      setEditingFloorId(null);
      setEditingFloorName("");
    }
  };

  const handleDeleteFloor = (id: string) => {
    if (!confirm("Are you sure you want to delete this floor?")) return;
    void onDeleteFloor(id);
  };

  return (
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
      ) : buildings.length > 0 ? (
        <div className="space-y-3">
          {buildings.map((building) => {
            const isExpanded = expandedBuildings.has(building.id);
            const floors = floorsByBuilding.get(building.id) || [];

            return (
              <div key={building.id} className="rounded-lg border bg-card">
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
                        onCheckedChange={() => onToggleBuildingActive(building.id, building.is_active)}
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

                {isExpanded && (
                  <div className="border-t bg-muted/30 p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={selectedBuildingForFloor === building.id ? newFloorName : ""}
                        onChange={(e) => {
                          setSelectedBuildingForFloor(building.id);
                          setNewFloorName(e.target.value);
                        }}
                        placeholder="Add floor (e.g., Floor 1, Street A...)"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateFloor(building.id)}
                        className="h-8 text-sm"
                        disabled={isSubmitting}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleCreateFloor(building.id)}
                        disabled={
                          isSubmitting || !newFloorName.trim() || selectedBuildingForFloor !== building.id
                        }
                      >
                        <PlusIcon />
                      </Button>
                    </div>

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
                                  onCheckedChange={() => onToggleFloorActive(floor.id, floor.is_active)}
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
  );
}
