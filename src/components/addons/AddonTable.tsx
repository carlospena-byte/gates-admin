import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { navigateToAddonDetail } from "@/config/routes";
import { EditIcon, DeleteIcon } from "@/components/icons";
import type { Addon } from "@/types/unit-wizard.types";

interface AddonTableProps {
  addons: Addon[];
  isLoading: boolean;
  isSubmitting: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

function unitsLinkedCount(addon: Addon): number {
  return (addon.items ?? []).reduce((sum, item) => sum + (item.unit_addons?.[0]?.count ?? 0), 0);
}

export function AddonTable({ addons, isLoading, isSubmitting, onDelete, onToggleActive }: AddonTableProps) {
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
                    className="w-1/4"
                  >
                    Name
                  </SortableTableHead>
                  <TableHead className="w-1/4">Type</TableHead>
                  <TableHead className="w-[110px]">Internal count</TableHead>
                  <TableHead className="w-[90px]">Units</TableHead>
                  <TableHead className="w-[100px]">Active</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAddons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell className="font-medium">
                      <span className="truncate">{addon.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">
                        {addon.addon_types?.name || "No type"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="cursor-default">
                        {addon.item_count?.[0]?.count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="cursor-default">
                        {unitsLinkedCount(addon)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={addon.is_active}
                        onCheckedChange={() => onToggleActive(addon.id, addon.is_active)}
                        disabled={isSubmitting}
                        aria-label={`Set ${addon.name} ${addon.is_active ? "inactive" : "active"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigateToAddonDetail(addon.id)}
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
                          <DeleteIcon />
                        </Button>
                      </div>
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
