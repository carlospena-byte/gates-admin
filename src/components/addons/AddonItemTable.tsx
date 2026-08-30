import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import { LocationCombobox } from "@/components/units/LocationCombobox";
import { EditIcon, DeleteIcon } from "@/components/icons";
import type { AddonItem, Location, LocationTypeDefinition, UpdateAddonItemDto } from "@/types/unit-wizard.types";

interface AddonItemTableProps {
  items: AddonItem[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, dto: UpdateAddonItemDto) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function AddonItemTable({
  items,
  locations,
  locationTypes,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: AddonItemTableProps) {
  const {
    paginatedData: paginatedItems,
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
    data: items,
    defaultSortField: "name" as keyof AddonItem,
    itemsPerPage: 10,
  });

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingPrice, setEditingPrice] = useState("");

  const startEditing = (item: AddonItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingLocationId(item.location_id || "");
    setEditingPrice(item.price !== null ? String(item.price) : "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingLocationId("");
    setEditingPrice("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const ok = await onUpdate(id, {
      name: editingName.trim(),
      location_id: editingLocationId || null,
      price: editingPrice.trim() ? Number(editingPrice) : null,
    });
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
          Addon Items
          {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : items.length > 0 ? (
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
                  <TableHead className="w-1/4">Location</TableHead>
                  <TableHead className="w-[110px]">Price</TableHead>
                  <TableHead className="w-[110px]">Active</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {editingId === item.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Item name"
                          className="h-8"
                          autoFocus
                          disabled={isSubmitting}
                        />
                      ) : (
                        <span className="truncate">{item.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <LocationCombobox
                          locations={locations}
                          locationTypes={locationTypes}
                          value={editingLocationId}
                          onChange={setEditingLocationId}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">
                          {item.locations ? getLocationFullPath(item.locations, locations) : "No location"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(e.target.value)}
                          placeholder="0.00"
                          className="h-8"
                          disabled={isSubmitting}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">{formatCurrency(item.price)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => onToggleActive(item.id, item.is_active)}
                        disabled={isSubmitting || editingId === item.id}
                        aria-label={`Set ${item.name} ${item.is_active ? "inactive" : "active"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(item.id)}
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
                            onClick={() => startEditing(item)}
                            disabled={isSubmitting}
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id, item.name)}
                            disabled={isSubmitting}
                          >
                            <DeleteIcon />
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
        <div className="text-center py-8 text-sm text-muted-foreground">No addon items yet. Create one above.</div>
      )}
    </div>
  );
}
