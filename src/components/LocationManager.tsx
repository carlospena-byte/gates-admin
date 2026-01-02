/**
 * Location Manager
 * Side sheet for managing hierarchical locations CRUD
 * Supports: TOWER, FLOOR, POLYGON, PASAJE, STREET with parent-child relationships
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { locationService, locationTypeService } from "@/services";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { LocationTypeManager } from "@/components/LocationTypeManager";
import type { Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationManagerProps {
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

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export function LocationManager({ open, onOpenChange, residentialId }: LocationManagerProps) {
  // Manual state management for data fetching
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  // Use pagination & sorting hook
  const {
    paginatedData: paginatedLocations,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    resetPage,
  } = usePaginatedSortedData({
    data: locations,
    defaultSortField: "name" as keyof Location,
    itemsPerPage: 10,
  });

  // Form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState("");
  const [editingParentId, setEditingParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [locationsResult, typesResult] = await Promise.all([
      locationService.list(residentialId),
      locationTypeService.list(residentialId),
    ]);
    setIsLoading(false);

    if (locationsResult.success) {
      setLocations(locationsResult.data);
      resetPage();
    } else {
      toast.error(locationsResult.error.message);
    }

    if (typesResult.success) {
      setLocationTypes(typesResult.data.filter((t) => t.is_active));
    }
  }, [residentialId, resetPage]);

  // Load data when sheet opens
  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, loadData]);

  const loadLocations = useCallback(async () => {
    const result = await locationService.list(residentialId);
    if (result.success) {
      setLocations(result.data);
    }
  }, [residentialId]);

  const handleCreate = async () => {
    if (!newName.trim() || !newType) return;

    setIsSubmitting(true);

    const result = await locationService.create({
      residential_id: residentialId,
      name: newName.trim(),
      type: newType,
      parent_id: newParentId || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewName("");
      setNewType("");
      setNewParentId("");
      toast.success("Location created successfully");
      await loadLocations();
    } else {
      toast.error(result.error?.message || "Failed to create location");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingType) return;

    setIsSubmitting(true);

    const result = await locationService.update(id, {
      name: editingName.trim(),
      type: editingType,
      parent_id: editingParentId || null,
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingId(null);
      setEditingName("");
      setEditingType("");
      setEditingParentId("");
      toast.success("Location updated successfully");
      await loadLocations();
    } else {
      toast.error(result.error?.message || "Failed to update location");
    }
  };

  const handleDelete = (id: string, name: string) => {
    const toastId = toast(`Delete "${name}"?`, {
      description: "This action cannot be undone.",
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: async () => {
          toast.dismiss(toastId);
          setIsSubmitting(true);
          const result = await locationService.delete(id);
          setIsSubmitting(false);

          if (result.success) {
            toast.success("Location deleted successfully");
            await loadLocations();
          } else {
            toast.error(result.error?.message || "Failed to delete location");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.dismiss(toastId);
        },
      },
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const result = await locationService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadLocations();
    } else {
      toast.error("Failed to toggle location status");
    }
  };

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditingName(location.name);
    setEditingType(location.type);
    setEditingParentId(location.parent_id || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingType("");
    setEditingParentId("");
  };

  // Get available parent locations (excluding the current location and its children)
  const getAvailableParents = (currentId?: string) => {
    return locations.filter((loc) => loc.id !== currentId);
  };

  const getLocationLabel = (location: Location) => {
    const typeName = locationTypes.find(t => t.code === location.type)?.name || location.type;
    const parentName = location.parent_id
      ? locations.find(l => l.id === location.parent_id)?.name
      : null;
    return parentName ? `${location.name} (${typeName} - Parent: ${parentName})` : `${location.name} (${typeName})`;
  };

  const getTypeLabel = (code: string) => {
    return locationTypes.find(t => t.code === code)?.name || code;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Manage Locations</SheetTitle>
              <SheetDescription>
                Create and manage hierarchical locations
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTypeManagerOpen(true)}
            >
              <SettingsIcon />
              <span className="ml-2">Manage Types</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Location</label>
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Location name (e.g., Tower A, Floor 3)"
                disabled={isSubmitting}
              />
              <Select value={newType} onValueChange={setNewType} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location type" />
                </SelectTrigger>
                <SelectContent>
                  {locationTypes.length > 0 ? (
                    locationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No types available - Click "Manage Types" to add
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select value={newParentId || "none"} onValueChange={(value) => setNewParentId(value === "none" ? "" : value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root level)</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {getLocationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newName.trim() || !newType}
                className="w-full"
              >
                {isSubmitting ? <Spinner size="sm" /> : <><PlusIcon /> <span className="ml-2">Add Location</span></>}
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Existing Locations
                {totalItems > 0 && (
                  <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
                )}
              </label>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : locations && locations.length > 0 ? (
              <>
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          field="name"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-1/4"
                        >
                          Name
                        </SortableTableHead>
                        <SortableTableHead
                          field="type"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-1/6"
                        >
                          Type
                        </SortableTableHead>
                        <TableHead className="w-1/4">Parent</TableHead>
                        <TableHead className="w-[110px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLocations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">
                            {editingId === location.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                placeholder="Location name"
                                className="h-8"
                                autoFocus
                                disabled={isSubmitting}
                              />
                            ) : (
                              <span className="truncate">{location.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === location.id ? (
                              <Select
                                value={editingType}
                                onValueChange={setEditingType}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {locationTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.code}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm truncate">
                                {getTypeLabel(location.type)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === location.id ? (
                              <Select value={editingParentId || "none"} onValueChange={(value) => setEditingParentId(value === "none" ? "" : value)} disabled={isSubmitting}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Parent" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {getAvailableParents(location.id).map((parent) => (
                                    <SelectItem key={parent.id} value={parent.id}>
                                      {parent.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground truncate">
                                {location.parent_id
                                  ? locations.find(l => l.id === location.parent_id)?.name || "Unknown"
                                  : "None"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={location.is_active}
                              onCheckedChange={() => handleToggleActive(location.id, location.is_active)}
                              disabled={isSubmitting || editingId === location.id}
                              aria-label={`Set ${location.name} ${location.is_active ? "inactive" : "active"}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {editingId === location.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdate(location.id)}
                                  disabled={isSubmitting || !editingName.trim() || !editingType}
                                >
                                  {isSubmitting ? <Spinner size="sm" /> : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(location)}
                                  disabled={isSubmitting}
                                >
                                  <EditIcon />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(location.id, location.name)}
                                  disabled={isSubmitting}
                                >
                                  <TrashIcon />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No locations yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Location Type Manager Dialog */}
      <LocationTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={loadData}
      />
    </Sheet>
  );
}
