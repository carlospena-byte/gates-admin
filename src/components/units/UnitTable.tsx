/**
 * Existing-units table: pagination/sorting, inline row editing, and the
 * expandable addon list. Owns its own "which row is being edited" state.
 */

import { Fragment, useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { getLocationFullPath, locationHasChildren } from "@/lib/locationHierarchy";
import { EditIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from "./icons";
import type { UnitFormPayload } from "@/hooks/useUnitManagerData";
import type { UnitType, Location, Addon, UnitWithWizardData } from "@/types/unit-wizard.types";

interface UnitTableProps {
  units: UnitWithWizardData[];
  unitTypes: UnitType[];
  locations: Location[];
  addons: Addon[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, payload: UnitFormPayload) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function UnitTable({
  units,
  unitTypes,
  locations,
  addons,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: UnitTableProps) {
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

  // Reset to the first page whenever the unit list is reloaded (including
  // after a create/update/delete, matching the manager's previous behavior).
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingUnitTypeId, setEditingUnitTypeId] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingAddonIds, setEditingAddonIds] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const handleAddonToggle = (addonId: string) => {
    setEditingAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId],
    );
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    const ok = await onUpdate(id, {
      name: editingName.trim(),
      unitTypeId: editingUnitTypeId,
      locationId: editingLocationId,
      addonIds: editingAddonIds,
    });

    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    const toastId = toast(`Delete "${name}"?`, {
      description: "This action cannot be undone.",
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: async () => {
          toast.dismiss(toastId);
          await onDelete(id);
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

  return (
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
      ) : units.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No units yet. Create one above.</div>
      ) : (
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
                          {unitTypes.map((type) => (
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
                            .filter((location) => location.is_active && !locationHasChildren(location.id, locations))
                            .sort((a, b) =>
                              getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations)),
                            )
                            .map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {getLocationFullPath(location, locations)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">
                        {getLocationFullPath(unit.locations, locations) || "—"}
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
                      onCheckedChange={() => onToggleActive(unit.id, unit.is_active)}
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
                        <Button size="sm" variant="ghost" onClick={() => startEditing(unit)} disabled={isSubmitting}>
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

                {editingId === unit.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="bg-muted/30 py-3">
                      <div className="px-4 max-h-40 overflow-y-auto">
                        <label className="text-sm font-medium mb-2 block">Edit Addons</label>
                        {addons.filter((a) => a.is_active).length > 0 ? (
                          addons
                            .filter((a) => a.is_active)
                            .map((addon) => (
                              <div key={addon.id} className="flex items-center space-x-2 py-1">
                                <input
                                  type="checkbox"
                                  id={`addon-edit-${addon.id}`}
                                  checked={editingAddonIds.includes(addon.id)}
                                  onChange={() => handleAddonToggle(addon.id)}
                                  disabled={isSubmitting}
                                  className="h-4 w-4"
                                />
                                <label htmlFor={`addon-edit-${addon.id}`} className="text-sm cursor-pointer">
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
      )}
    </div>
  );
}
