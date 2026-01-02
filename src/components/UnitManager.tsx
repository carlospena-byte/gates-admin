/**
 * Unit Manager
 * Side sheet for managing units CRUD with relationships
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import {
  unitService,
  unitTypeService,
  locationService,
  locationTypeService,
  addonService,
  unitAddonService,
} from "@/services";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import type {
  UnitWithWizardData,
  UnitType,
  Location,
  LocationTypeDefinition,
  Addon,
} from "@/types/unit-wizard.types";

interface UnitManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  showList?: boolean;
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

export function UnitManager({ open, onOpenChange, residentialId, showList = true }: UnitManagerProps) {
  // Manual state management for data fetching
  const [units, setUnits] = useState<UnitWithWizardData[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use pagination & sorting hook
  const {
    paginatedData: paginatedUnits,
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
    data: units,
    defaultSortField: "name" as keyof UnitWithWizardData,
    itemsPerPage: 10,
  });

  // Form state
  const [newName, setNewName] = useState("");
  const [newUnitTypeId, setNewUnitTypeId] = useState("");
  const [newParentLocationType, setNewParentLocationType] = useState("");
  const [newParentLocationId, setNewParentLocationId] = useState("");
  const [newChildLocationType, setNewChildLocationType] = useState("");
  const [newLocationId, setNewLocationId] = useState("");
  const [newAddonIds, setNewAddonIds] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingUnitTypeId, setEditingUnitTypeId] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingAddonIds, setEditingAddonIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded rows for addon display
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [typesResult, locationsResult, locationTypesResult, addonsResult] = await Promise.all([
      unitTypeService.list(residentialId),
      locationService.list(residentialId),
      locationTypeService.list(residentialId),
      addonService.list(residentialId),
    ]);

    const unitsResult = showList
      ? await unitService.listWithRelations(residentialId)
      : ({ success: true as const, data: [] as UnitWithWizardData[] });

    setIsLoading(false);

    if (showList) {
      if (unitsResult.success) {
        setUnits(unitsResult.data);
        resetPage(); // Reset to first page when data loads
      } else {
        toast.error(unitsResult.error.message);
      }
    } else {
      setUnits([]);
    }

    if (typesResult.success) {
      setUnitTypes(typesResult.data);
    }

    if (locationsResult.success) {
      setLocations(locationsResult.data);
    }

    if (locationTypesResult.success) {
      setLocationTypes(locationTypesResult.data.filter((t) => t.is_active));
    }

    if (addonsResult.success) {
      setAddons(addonsResult.data);
    }
  }, [residentialId, resetPage, showList]);

  // Load data when sheet opens
  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, loadData]);

  // Helper function to get location full path
  const getLocationFullPath = (location: Location | null | undefined): string => {
    if (!location) return "";

    const parts: string[] = [];
    let current: Location | undefined = location;

    // Walk up the parent chain
    while (current) {
      parts.unshift(current.name);
      const parentId: string | null = current.parent_id;
      current = parentId ? locations.find((l) => l.id === parentId) : undefined;
    }

    return parts.join(" → ");
  };

  const locationHasChildren = (locationId: string) => locations.some((l) => l.parent_id === locationId);

  const getLocationTypeLabel = (typeCode: string) =>
    locationTypes.find((t) => t.code === typeCode)?.name || typeCode;

  const parentLocationTypeOptions = (() => {
    if (locationTypes.length) return locationTypes.map((t) => ({ code: t.code, name: t.name }));
    const codes = Array.from(new Set(locations.map((l) => l.type))).sort();
    return codes.map((code) => ({ code, name: code }));
  })();

  const parentLocationsForSelectedType = (() => {
    if (!newParentLocationType) return [];
    return locations
      .filter((l) => l.is_active && l.type === newParentLocationType)
      .sort((a, b) => getLocationFullPath(a).localeCompare(getLocationFullPath(b)));
  })();

  const childLocationsForSelectedParent = useMemo(() => {
    if (!newParentLocationId) return [];
    return locations.filter((l) => l.parent_id === newParentLocationId);
  }, [locations, newParentLocationId]);

  const childLocationTypeOptions = useMemo(() => {
    const codes = Array.from(new Set(childLocationsForSelectedParent.map((l) => l.type))).sort();
    return codes.map((code) => ({ code, name: getLocationTypeLabel(code) }));
  }, [childLocationsForSelectedParent]);

  // Location selection behavior:
  // - user picks a (parent) location first
  // - if that location has children, user must pick a child (leaf) location
  // - if it has no children, it is treated as the leaf location
  useEffect(() => {
    if (!newParentLocationId) {
      setNewChildLocationType("");
      setNewLocationId("");
      return;
    }

    const hasChildren = locations.some((l) => l.parent_id === newParentLocationId);
    if (hasChildren) {
      const children = locations.filter((l) => l.parent_id === newParentLocationId);
      const childTypes = Array.from(new Set(children.map((l) => l.type))).sort();

      // If there's only one possible child type, auto-select it.
      setNewChildLocationType(childTypes.length === 1 ? childTypes[0] : "");
      setNewLocationId("");
      return;
    }

    setNewChildLocationType("");
    setNewLocationId(newParentLocationId);
  }, [newParentLocationId, locations]);

  // Helper function to toggle row expansion
  const toggleRowExpansion = (unitId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUnitTypeId) return;

    if (newParentLocationType && !newParentLocationId) {
      toast.error("Select a location");
      return;
    }

    if (newParentLocationId && locationHasChildren(newParentLocationId) && (!newChildLocationType || !newLocationId)) {
      toast.error("Select a sub-location");
      return;
    }

    setIsSubmitting(true);

    // Step 1: Create unit record
    const unitResult = await unitService.create({
      residential_id: residentialId,
      name: newName.trim(),
      unit_type_id: newUnitTypeId || null,
      location_id: newLocationId || null,
      is_active: true,
    });

    if (unitResult.success) {
      // Step 2: If addons selected, attach them
      if (newAddonIds.length > 0) {
        await unitAddonService.createMany(unitResult.data.id, newAddonIds);
      }

      setNewName("");
      setNewUnitTypeId("");
      setNewParentLocationType("");
      setNewParentLocationId("");
      setNewChildLocationType("");
      setNewLocationId("");
      setNewAddonIds([]);
      toast.success("Unit created successfully");
      await loadData();
    } else {
      if (unitResult.error?.code === "23505") {
        toast.error("A unit with that name already exists");
      } else {
        toast.error(unitResult.error?.message || "Failed to create unit");
      }
    }

    setIsSubmitting(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    setIsSubmitting(true);

    // Step 1: Update unit record
    const updateResult = await unitService.update(id, {
      name: editingName.trim(),
      unit_type_id: editingUnitTypeId || null,
      location_id: editingLocationId || null,
    });

    if (updateResult.success) {
      // Step 2: Sync addons (delete all, re-create)
      await unitAddonService.deleteByUnitId(id);
      if (editingAddonIds.length > 0) {
        await unitAddonService.createMany(id, editingAddonIds);
      }

      setEditingId(null);
      setEditingName("");
      setEditingUnitTypeId("");
      setEditingLocationId("");
      setEditingAddonIds([]);
      toast.success("Unit updated successfully");
      await loadData();
    } else {
      toast.error(updateResult.error?.message || "Failed to update unit");
    }

    setIsSubmitting(false);
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
          const result = await unitService.delete(id);
          setIsSubmitting(false);

          if (result.success) {
            toast.success("Unit deleted successfully");
            await loadData();
          } else {
            toast.error(result.error?.message || "Failed to delete unit");
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
    const result = await unitService.update(id, { is_active: !currentStatus });
    if (result.success) {
      await loadData();
    } else {
      toast.error("Failed to toggle unit status");
    }
  };

  const startEditing = (unit: UnitWithWizardData) => {
    setEditingId(unit.id);
    setEditingName(unit.name);
    setEditingUnitTypeId(unit.unit_type_id || "");
    setEditingLocationId(unit.location_id || "");
    setEditingAddonIds(unit.unit_addons?.map((ua) => ua.addon_id) || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingUnitTypeId("");
    setEditingLocationId("");
    setEditingAddonIds([]);
  };

  const handleAddonToggle = (addonId: string, isCreate: boolean) => {
    if (isCreate) {
      setNewAddonIds((prev) =>
        prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
      );
    } else {
      setEditingAddonIds((prev) =>
        prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
      );
    }
  };

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
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Unit</label>
            <div className="space-y-2">
              {/* Name Input - Required */}
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Unit name (e.g., 101, A-203)"
                disabled={isSubmitting}
              />

              {/* Unit Type Selector - Required */}
                <Select
                  value={newUnitTypeId}
                  onValueChange={(value) => {
                    setNewUnitTypeId(value);
                    // Force the flow: pick a type first, then location.
                    setNewParentLocationType("");
                    setNewParentLocationId("");
                    setNewChildLocationType("");
                    setNewLocationId("");
                  }}
                  disabled={isSubmitting}
                >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  {unitTypes && unitTypes.length > 0 ? (
                    unitTypes
                      .filter((type) => type.is_active)
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                  ) : null}
                </SelectContent>
              </Select>

              {/* Location Type (e.g., Torre) */}
              <Select
                value={newParentLocationType || "none"}
                onValueChange={(value) => {
                  const typeCode = value === "none" ? "" : value;
                  setNewParentLocationType(typeCode);
                  setNewParentLocationId("");
                  setNewChildLocationType("");
                  setNewLocationId("");
                }}
                disabled={isSubmitting || !newUnitTypeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={newUnitTypeId ? "Select location type (optional)" : "Select unit type first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentLocationTypeOptions.map((t) => (
                    <SelectItem key={t.code} value={t.code}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Location (e.g., Torre A) */}
              <Select
                value={newParentLocationId || "none"}
                onValueChange={(value) => setNewParentLocationId(value === "none" ? "" : value)}
                disabled={isSubmitting || !newUnitTypeId || !newParentLocationType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={newParentLocationType ? "Select location" : "Select location type first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentLocationsForSelectedType.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {getLocationFullPath(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Child location type (e.g., Piso) + child location (e.g., Piso 1) */}
              {newParentLocationId && locationHasChildren(newParentLocationId) ? (
                <>
                  <Select
                    value={newChildLocationType || "none"}
                    onValueChange={(value) => {
                      const typeCode = value === "none" ? "" : value;
                      setNewChildLocationType(typeCode);
                      setNewLocationId("");
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select child location type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {childLocationTypeOptions.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={newLocationId || "none"}
                    onValueChange={(value) => setNewLocationId(value === "none" ? "" : value)}
                    disabled={isSubmitting || !newChildLocationType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newChildLocationType ? "Select child location" : "Select child type first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {childLocationsForSelectedParent
                        .filter((l) => l.type === newChildLocationType)
                        .sort((a, b) => getLocationFullPath(a).localeCompare(getLocationFullPath(b)))
                        .map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {getLocationFullPath(location)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}

              {/* Addons Checkboxes - Optional */}
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                <label className="text-sm font-medium mb-2 block">Addons (optional)</label>
                {addons && addons.length > 0 ? (
                  addons
                    .filter((a) => a.is_active)
                    .map((addon) => (
                      <div key={addon.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          id={`addon-new-${addon.id}`}
                          checked={newAddonIds.includes(addon.id)}
                          onChange={() => handleAddonToggle(addon.id, true)}
                          disabled={isSubmitting}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`addon-new-${addon.id}`} className="text-sm cursor-pointer">
                          {addon.name} ({addon.addon_types?.name})
                        </label>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">No addons available</p>
                )}
              </div>

                <Button
                  onClick={handleCreate}
                  disabled={
                    isSubmitting ||
                    !newName.trim() ||
                    !newUnitTypeId ||
                    (!!newParentLocationType && !newParentLocationId) ||
                    (!!newParentLocationId &&
                      locationHasChildren(newParentLocationId) &&
                      (!newChildLocationType || !newLocationId))
                  }
                  className="w-full"
                >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <PlusIcon /> <span className="ml-2">Add Unit</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {showList ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Existing Units
                {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
              </label>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : units && units.length > 0 ? (
              <>
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30px]"></TableHead>
                        <SortableTableHead
                          field="name"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-1/5"
                        >
                          Name
                        </SortableTableHead>
                        <TableHead className="w-1/5">Type</TableHead>
                        <TableHead className="w-1/5">Location</TableHead>
                        <TableHead className="w-[120px]">Addons</TableHead>
                        <TableHead className="w-[80px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedUnits.map((unit) => (
                        <Fragment key={unit.id}>
                          <TableRow>
                            <TableCell>
                              {editingId !== unit.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRowExpansion(unit.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  {expandedRows.has(unit.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {editingId === unit.id ? (
                                <Input
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  placeholder="Unit name"
                                  className="h-8"
                                  autoFocus
                                  disabled={isSubmitting}
                                />
                              ) : (
                                <span className="truncate">{unit.name}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === unit.id ? (
                                <Select
                                  value={editingUnitTypeId || "none"}
                                  onValueChange={(value) => setEditingUnitTypeId(value === "none" ? "" : value)}
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {unitTypes?.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground truncate">
                                  {unit.unit_types?.name || "—"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === unit.id ? (
                                <Select
                                  value={editingLocationId || "none"}
                                  onValueChange={(value) => setEditingLocationId(value === "none" ? "" : value)}
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {locations
                                      ?.filter((location) => location.is_active && !locationHasChildren(location.id))
                                      .sort((a, b) => getLocationFullPath(a).localeCompare(getLocationFullPath(b)))
                                      .map((location) => (
                                        <SelectItem key={location.id} value={location.id}>
                                          {getLocationFullPath(location)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-sm text-muted-foreground truncate">
                                  {getLocationFullPath(unit.locations) || "—"}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {editingId === unit.id ? (
                                <span className="text-xs text-muted-foreground">See below</span>
                              ) : (
                                <Badge variant="secondary" className="cursor-default">
                                  {unit.unit_addons?.length || 0}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={unit.is_active}
                                onCheckedChange={() => handleToggleActive(unit.id, unit.is_active)}
                                disabled={isSubmitting || editingId === unit.id}
                                aria-label={`Set ${unit.name} ${unit.is_active ? "inactive" : "active"}`}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {editingId === unit.id ? (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdate(unit.id)}
                                    disabled={isSubmitting || !editingName.trim()}
                                  >
                                    {isSubmitting ? <Spinner size="sm" /> : "Save"}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditing(unit)}
                                    disabled={isSubmitting}
                                  >
                                    <EditIcon />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(unit.id, unit.name)}
                                    disabled={isSubmitting}
                                  >
                                    <TrashIcon />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Expandable row for addon details */}
                          {expandedRows.has(unit.id) && editingId !== unit.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/50 py-2">
                                <div className="flex gap-1 flex-wrap px-2">
                                  {unit.unit_addons && unit.unit_addons.length > 0 ? (
                                    unit.unit_addons.map((ua) => (
                                      <Badge key={ua.id} variant="secondary">
                                        {ua.addons?.name}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-sm text-muted-foreground">No addons</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}

                          {/* Editing addon checkboxes */}
                          {editingId === unit.id && (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/30 py-3">
                                <div className="px-4 max-h-40 overflow-y-auto">
                                  <label className="text-sm font-medium mb-2 block">Edit Addons</label>
                                  {addons && addons.length > 0 ? (
                                    addons
                                      .filter((a) => a.is_active)
                                      .map((addon) => (
                                        <div key={addon.id} className="flex items-center space-x-2 py-1">
                                          <input
                                            type="checkbox"
                                            id={`addon-edit-${addon.id}`}
                                            checked={editingAddonIds.includes(addon.id)}
                                            onChange={() => handleAddonToggle(addon.id, false)}
                                            disabled={isSubmitting}
                                            className="h-4 w-4"
                                          />
                                          <label
                                            htmlFor={`addon-edit-${addon.id}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {addon.name} ({addon.addon_types?.name})
                                          </label>
                                        </div>
                                      ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No addons available</p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
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
              <div className="text-center py-8 text-sm text-muted-foreground">No units yet. Create one above.</div>
            )}
          </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
