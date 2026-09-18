/**
 * Residential-wide resident list — same usePaginatedSortedData +
 * SortableTableHead + Pagination scaffolding as every other table.
 */

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { navigateToUnitDetail } from "@/config/routes";
import type { ResidentWithUnit } from "@/types/unit-wizard.types";

interface ResidentTableProps {
  residents: ResidentWithUnit[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function ResidentTable({ residents, isLoading, isSubmitting, canManage, onToggleActive, onDelete }: ResidentTableProps) {
  const {
    paginatedData: paginatedResidents,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData({
    data: residents,
    defaultSortField: "full_name" as keyof ResidentWithUnit,
    itemsPerPage: 10,
  });

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (residents.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No residents yet.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="full_name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                Name
              </SortableTableHead>
              <TableHead>Property</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResidents.map((resident) => (
              <TableRow key={resident.id}>
                <TableCell className="font-medium">{resident.full_name}</TableCell>
                <TableCell>
                  {resident.units?.name ? (
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      onClick={() => navigateToUnitDetail(resident.unit_id)}
                    >
                      {resident.units.name}
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{resident.phone ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{resident.email}</TableCell>
                <TableCell>
                  <Switch
                    checked={resident.is_active}
                    onCheckedChange={() => onToggleActive(resident.id, resident.is_active)}
                    disabled={isSubmitting || !canManage}
                    aria-label={`Set ${resident.full_name} ${resident.is_active ? "inactive" : "active"}`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(resident.id, resident.full_name)} disabled={isSubmitting}>
                      <DeleteIcon />
                    </Button>
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
    </div>
  );
}
