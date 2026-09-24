import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import { AddonItemEditSheet } from "@/components/addons/AddonItemEditSheet";
import { EditIcon, DeleteIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
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
  const { t } = useI18n();
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

  const [editingItem, setEditingItem] = useState<AddonItem | null>(null);

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {t("addonItem.table.title")}
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
                    {t("common.name")}
                  </SortableTableHead>
                  <TableHead className="w-1/4">{t("common.location")}</TableHead>
                  <TableHead className="w-[110px]">{t("common.price")}</TableHead>
                  <TableHead className="w-[110px]">{t("common.active")}</TableHead>
                  <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <span className="truncate">{item.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">
                        {item.locations ? getLocationFullPath(item.locations, locations) : t("addonItem.table.noLocation")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">{formatCurrency(item.price)}</span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => onToggleActive(item.id, item.is_active)}
                        disabled={isSubmitting}
                        aria-label={
                          item.is_active
                            ? t("addonItem.table.setInactive", { name: item.name })
                            : t("addonItem.table.setActive", { name: item.name })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingItem(item)}
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
        <div className="text-center py-8 text-sm text-muted-foreground">{t("addonItem.table.empty")}</div>
      )}

      <AddonItemEditSheet
        item={editingItem}
        locations={locations}
        locationTypes={locationTypes}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSave={onUpdate}
      />
    </div>
  );
}
