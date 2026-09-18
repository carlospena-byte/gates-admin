/**
 * Visitor list table — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as UnitTable. Check-in/Check-out actions swap
 * based on status; both are visible to owner/admin and security alike
 * (RLS is the real gate — see the visitors_security migration).
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { cn } from "@/lib/utils";
import type { UnitWithOwner } from "@/services";
import type { VisitorStatus, VisitorWithInviter } from "@/types/visitor.types";

const STATUS_STYLES: Record<VisitorStatus, string> = {
  scheduled: "bg-secondary text-secondary-foreground",
  active: "bg-blue-100 text-blue-700",
  inside: "bg-green-100 text-green-700",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
};

interface VisitorTableProps {
  visitors: VisitorWithInviter[];
  units: UnitWithOwner[];
  isLoading: boolean;
  isSubmitting: boolean;
  /** Owner/admin only — deleting a visitor record. */
  canManage: boolean;
  /** Owner/admin or security — check-in/check-out, per the visitors RLS policies. */
  canCheckInOut: boolean;
  emptyMessage: string;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function VisitorTable({
  visitors,
  units,
  isLoading,
  isSubmitting,
  canManage,
  canCheckInOut,
  emptyMessage,
  onCheckIn,
  onCheckOut,
  onDelete,
}: VisitorTableProps) {
  const {
    paginatedData: paginatedVisitors,
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
    data: visitors,
    defaultSortField: "valid_from" as keyof VisitorWithInviter,
    itemsPerPage: 10,
  });

  const unitNameById = new Map(units.map((unit) => [unit.id, unit.name]));

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

  if (visitors.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                Visitor
              </SortableTableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Plate</TableHead>
              <SortableTableHead
                field="valid_until"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              >
                Valid Until
              </SortableTableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVisitors.map((visitor) => (
              <TableRow key={visitor.id}>
                <TableCell className="font-medium">{visitor.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {visitor.unit_id ? unitNameById.get(visitor.unit_id) ?? "—" : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {visitor.profiles?.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{visitor.plate ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(visitor.valid_until).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge className={cn("border-transparent capitalize", STATUS_STYLES[visitor.status])}>
                    {visitor.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canCheckInOut && visitor.status !== "inside" && visitor.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => onCheckIn(visitor.id)} disabled={isSubmitting}>
                        Check in
                      </Button>
                    )}
                    {canCheckInOut && visitor.status === "inside" && (
                      <Button size="sm" variant="outline" onClick={() => onCheckOut(visitor.id)} disabled={isSubmitting}>
                        Check out
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(visitor.id, visitor.name)} disabled={isSubmitting}>
                        <DeleteIcon />
                      </Button>
                    )}
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
    </div>
  );
}
