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
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { STATUS_LABEL_KEYS, VISIT_TYPE_LABEL_KEYS } from "./visitorLabels";
import type { UnitWithOwner } from "@/services";
import type { VisitorStatus, VisitorWithInviter } from "@/types/visitor.types";

const STATUS_STYLES: Record<VisitorStatus, string> = {
  pending_registration: "bg-amber-100 text-amber-700",
  scheduled: "bg-secondary text-secondary-foreground",
  active: "bg-blue-100 text-blue-700",
  inside: "bg-green-100 text-green-700",
  completed: "bg-secondary text-secondary-foreground",
  cancelled: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-secondary text-secondary-foreground",
};

/** Terminal/history statuses — no further check-in/out or deletion applies. */
const HISTORY_STATUSES: ReadonlySet<VisitorStatus> = new Set([
  "completed",
  "cancelled",
  "rejected",
  "expired",
]);

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
  const { t } = useI18n();
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

  const handleDelete = (id: string, name: string | null) => {
    confirmDeleteToast(name ?? t("visitors.table.pendingRegistration"), async () => {
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
                {t("visitors.table.visitor")}
              </SortableTableHead>
              <TableHead>{t("visitors.table.type")}</TableHead>
              <TableHead>{t("common.unit")}</TableHead>
              <TableHead>{t("visitors.table.invitedBy")}</TableHead>
              <TableHead>{t("visitors.table.plate")}</TableHead>
              <SortableTableHead
                field="valid_until"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              >
                {t("visitors.table.validUntil")}
              </SortableTableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVisitors.map((visitor) => (
              <TableRow key={visitor.id}>
                <TableCell className="font-medium">
                  {visitor.name ?? (
                    <span className="italic text-muted-foreground">{t("visitors.table.pendingRegistration")}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t(VISIT_TYPE_LABEL_KEYS[visitor.visit_type])}
                </TableCell>
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
                    {t(STATUS_LABEL_KEYS[visitor.status])}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canCheckInOut && visitor.status !== "inside" && !HISTORY_STATUSES.has(visitor.status) && (
                      <Button size="sm" variant="outline" onClick={() => onCheckIn(visitor.id)} disabled={isSubmitting}>
                        {t("visitors.table.checkIn")}
                      </Button>
                    )}
                    {canCheckInOut && visitor.status === "inside" && (
                      <Button size="sm" variant="outline" onClick={() => onCheckOut(visitor.id)} disabled={isSubmitting}>
                        {t("visitors.table.checkOut")}
                      </Button>
                    )}
                    {canManage && !HISTORY_STATUSES.has(visitor.status) && (
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
