import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { navigateToChargeDetail } from "@/config/routes";
import { EditIcon, DeleteIcon } from "@/components/icons";
import type { Charge } from "@/types/unit-wizard.types";

interface ChargeTableProps {
  charges: Charge[];
  isLoading: boolean;
  isSubmitting: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function ChargeTable({ charges, isLoading, isSubmitting, onDelete, onToggleActive }: ChargeTableProps) {
  const {
    paginatedData: paginatedCharges,
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
    data: charges,
    defaultSortField: "name" as keyof Charge,
    itemsPerPage: 10,
  });

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges]);

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          Existing Charges
          {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : charges.length > 0 ? (
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
                  <TableHead className="w-1/3">Description</TableHead>
                  <TableHead className="w-[90px]">Units</TableHead>
                  <TableHead className="w-[100px]">Active</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCharges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      <span className="truncate">{charge.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate">{charge.description || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="cursor-default">
                        {charge.unit_charges?.[0]?.count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={charge.is_active}
                        onCheckedChange={() => onToggleActive(charge.id, charge.is_active)}
                        disabled={isSubmitting}
                        aria-label={`Set ${charge.name} ${charge.is_active ? "inactive" : "active"}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigateToChargeDetail(charge.id)}
                          disabled={isSubmitting}
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(charge.id, charge.name)}
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
        <div className="text-center py-8 text-sm text-muted-foreground">No charges yet. Create one above.</div>
      )}
    </div>
  );
}
