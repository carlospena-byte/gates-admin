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
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, TrashIcon } from "@/components/icons";
import type { Addon, AddonType, UpdateAddonDto } from "@/types/unit-wizard.types";

interface AddonTableProps {
  addons: Addon[];
  addonTypes: AddonType[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, dto: UpdateAddonDto) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function AddonTable({
  addons,
  addonTypes,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: AddonTableProps) {
  const {
    paginatedData: paginatedAddons,
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
    data: addons,
    defaultSortField: "name" as keyof Addon,
    itemsPerPage: 10,
  });

  // Reset to page 1 whenever the addon list is reloaded (including after a
  // create/update/delete), matching the manager's previous behavior.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");

  const startEditing = (id: string, name: string, typeId: string) => {
    setEditingId(id);
    setEditingName(name);
    setEditingTypeId(typeId);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingTypeId("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingTypeId) return;
    const ok = await onUpdate(id, { name: editingName.trim(), addon_type_id: editingTypeId });
    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Existing Addons
          {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : addons.length > 0 ? (
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
                    className="w-1/3"
                  >
                    Name
                  </SortableTableHead>
                  <TableHead className="w-1/3">Type</TableHead>
                  <TableHead className="w-[110px]">Active</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAddons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell className="font-medium">
                      {editingId === addon.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Addon name"
                          className="h-8"
                          autoFocus
                          disabled={isSubmitting}
                        />
                      ) : (
                        <span className="truncate">{addon.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === addon.id ? (
                        <Select value={editingTypeId} onValueChange={setEditingTypeId} disabled={isSubmitting}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {addonTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">
                          {addon.addon_types?.name || "No type"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={addon.is_active}
                        onCheckedChange={() => onToggleActive(addon.id, addon.is_active)}
                        disabled={isSubmitting || editingId === addon.id}
                        aria-label={`Set ${addon.name} ${addon.is_active ? "inactive" : "active"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === addon.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(addon.id)}
                            disabled={isSubmitting || !editingName.trim() || !editingTypeId}
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
                            onClick={() => startEditing(addon.id, addon.name, addon.addon_type_id)}
                            disabled={isSubmitting}
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(addon.id, addon.name)}
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
        <div className="text-center py-8 text-sm text-muted-foreground">No addons yet. Create one above.</div>
      )}
    </div>
  );
}
