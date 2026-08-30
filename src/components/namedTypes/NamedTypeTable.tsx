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
import { EditIcon, DeleteIcon } from "@/components/icons";

interface NamedTypeEntity {
  id: string;
  name: string;
  is_active: boolean;
}

interface NamedTypeTableProps<T extends NamedTypeEntity> {
  entityLabel: string;
  items: T[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function NamedTypeTable<T extends NamedTypeEntity>({
  entityLabel,
  items,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: NamedTypeTableProps<T>) {
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
  } = usePaginatedSortedData<T, "name">({
    data: items,
    defaultSortField: "name",
    itemsPerPage: 10,
  });

  // Reset to page 1 whenever the list is reloaded (including after a
  // create/update/delete), matching the original managers' behavior.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const ok = await onUpdate(id, editingName.trim());
    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  const lowerLabel = entityLabel.toLowerCase();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Existing {entityLabel}s
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
                    className="w-full"
                  >
                    Name
                  </SortableTableHead>
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(item.id);
                            if (e.key === "Escape") cancelEditing();
                          }}
                          className="h-8"
                          autoFocus
                          disabled={isSubmitting}
                        />
                      ) : (
                        <span className="truncate">{item.name}</span>
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
                            onClick={() => startEditing(item.id, item.name)}
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
        <div className="text-center py-8 text-sm text-muted-foreground">
          No {lowerLabel}s yet. Create one above.
        </div>
      )}
    </div>
  );
}
