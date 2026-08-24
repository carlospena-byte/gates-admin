import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { getLocationTypeLabel } from "@/lib/locationHierarchy";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, TrashIcon } from "@/components/icons";
import type { Location, LocationTypeDefinition, UpdateLocationDto } from "@/types/unit-wizard.types";

interface LocationTableProps {
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isLoading: boolean;
  isSubmitting: boolean;
  /** True while the sheet is open; used only to reset to page 1 on open, matching the original behavior. */
  open: boolean;
  onUpdate: (id: string, dto: UpdateLocationDto) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function LocationTable({
  locations,
  locationTypes,
  isLoading,
  isSubmitting,
  open,
  onUpdate,
  onDelete,
  onToggleActive,
}: LocationTableProps) {
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

  // Reset to page 1 only when the sheet is (re)opened, not after every
  // mutation-triggered refresh -- matches the original loadData/loadLocations split.
  useEffect(() => {
    if (open) resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState("");
  const [editingParentId, setEditingParentId] = useState("");

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

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingType) return;

    const ok = await onUpdate(id, {
      name: editingName.trim(),
      type: editingType,
      parent_id: editingParentId || null,
    });

    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  const getAvailableParents = (currentId?: string) => locations.filter((loc) => loc.id !== currentId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Existing Locations
          {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : locations.length > 0 ? (
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
                        <Select value={editingType} onValueChange={setEditingType} disabled={isSubmitting}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {locationTypes.map((t) => (
                              <SelectItem key={t.id} value={t.code}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm truncate">{getLocationTypeLabel(location.type, locationTypes)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === location.id ? (
                        <Select
                          value={editingParentId || "none"}
                          onValueChange={(value) => setEditingParentId(value === "none" ? "" : value)}
                          disabled={isSubmitting}
                        >
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
                            ? locations.find((l) => l.id === location.parent_id)?.name || "Unknown"
                            : "None"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={location.is_active}
                        onCheckedChange={() => onToggleActive(location.id, location.is_active)}
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
                          <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEditing(location)} disabled={isSubmitting}>
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
        <div className="text-center py-8 text-sm text-muted-foreground">No locations yet. Create one above.</div>
      )}
    </div>
  );
}
