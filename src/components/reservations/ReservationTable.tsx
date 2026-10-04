/**
 * Reservation list — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as every other Manager table. List view only, no
 * calendar widget, per the audit's own "don't over-build this" guidance.
 * Row checkboxes + a bulk action bar let a manager approve/cancel several
 * pending bookings at once instead of one at a time; a single "Revisar"
 * action per row opens the detail sheet rather than icon-only shortcuts,
 * since approve/reject both need the full context anyway.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { RejectReservationDialog } from "@/components/reservations/RejectReservationDialog";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { formatReservationDateLabel, formatReservationTimeLabel, isPastPendingBooking } from "@/lib/reservationFormat";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type { AmenityBookingStatus, AmenityBookingWithUser } from "@/types/amenities.types";

const STATUS_TONES: Record<AmenityBookingStatus, StatusTone> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "neutral",
  expired: "neutral",
};

export interface UnitInfo {
  name: string;
  path: string;
}

interface ReservationTableProps {
  bookings: AmenityBookingWithUser[];
  totalCount: number;
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  unitInfoById: Map<string, UnitInfo>;
  bookerNameById: Map<string, string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onBulkApprove: () => void;
  onBulkCancel: (reason?: string) => void;
  onReview: (booking: AmenityBookingWithUser) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  /** Row checkboxes + bulk bar; only meaningful for the pending tab. */
  allowBulk?: boolean;
  emptyMessage?: string;
}

export function ReservationTable({
  bookings,
  totalCount,
  isLoading,
  isSubmitting,
  canManage,
  unitInfoById,
  bookerNameById,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkApprove,
  onBulkCancel,
  onReview,
  hasActiveFilters,
  onClearFilters,
  allowBulk = true,
  emptyMessage,
}: ReservationTableProps) {
  const { t, locale } = useI18n();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const {
    paginatedData: paginatedBookings,
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
    data: bookings,
    // Oldest request first, so the longest-waiting booking is on top.
    defaultSortField: "created_at" as keyof AmenityBookingWithUser,
    itemsPerPage: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (totalCount === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage ?? t("reservations.table.empty")}</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
        <p>{t("reservations.table.noResults")}</p>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            {t("reservations.filter.clear")}
          </Button>
        )}
      </div>
    );
  }

  const selectableIds = paginatedBookings
    .filter((booking) => canManage && allowBulk && booking.status !== "cancelled" && booking.status !== "expired")
    .map((booking) => booking.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-2">
      {canManage && allowBulk && selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{t("reservations.bulk.selected", { count: selectedCount })}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)} disabled={isSubmitting}>
              {t("reservations.bulk.cancel")}
            </Button>
            <Button size="sm" onClick={onBulkApprove} disabled={isSubmitting}>
              {t("reservations.bulk.approve")}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {canManage && allowBulk && (
                <TableHead className="w-10">
                  <Checkbox
                    className="size-5 rounded"
                    checked={allSelected}
                    onCheckedChange={() => onToggleSelectAll(selectableIds)}
                    disabled={selectableIds.length === 0}
                    aria-label={t("reservations.bulk.selectAll")}
                  />
                </TableHead>
              )}
              <TableHead>{t("reservations.table.amenity")}</TableHead>
              <SortableTableHead field="start_time" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("reservations.table.when")}
              </SortableTableHead>
              <TableHead>{t("common.unit")}</TableHead>
              <TableHead>{t("reservations.table.bookedBy")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.map((booking) => {
              const canSelect = canManage && allowBulk && booking.status !== "cancelled" && booking.status !== "expired";
              const unitInfo = booking.unit_id ? unitInfoById.get(booking.unit_id) : undefined;
              const pastDue = isPastPendingBooking(booking.start_time, booking.status);
              return (
                <TableRow key={booking.id}>
                  {canManage && allowBulk && (
                    <TableCell className="py-3">
                      <Checkbox
                        className="size-5 rounded"
                        checked={selectedIds.has(booking.id)}
                        onCheckedChange={() => onToggleSelect(booking.id)}
                        disabled={!canSelect}
                        aria-label={t("reservations.bulk.selectRow")}
                      />
                    </TableCell>
                  )}
                  <TableCell className="py-3 text-sm font-medium">
                    <button type="button" className="text-left hover:underline" onClick={() => onReview(booking)}>
                      {booking.amenities?.name ?? "—"}
                    </button>
                  </TableCell>
                  <TableCell className="py-3 text-sm">
                    <p className="font-medium text-foreground">
                      {formatReservationDateLabel(booking.start_time, booking.end_time, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatReservationTimeLabel(booking.start_time, booking.end_time, locale)}
                    </p>
                    {pastDue && (
                      <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        {t("reservations.table.pastDate")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-sm">
                    <p className="font-medium text-foreground">{unitInfo?.name ?? booking.units?.name ?? "—"}</p>
                    {unitInfo?.path && <p className="text-xs text-muted-foreground">{unitInfo.path}</p>}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {bookerNameById.get(booking.id) ?? "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusBadge tone={STATUS_TONES[booking.status]}>
                      {t(`reservations.status.${booking.status}`)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <Button variant="link" className="h-auto p-0 font-semibold" onClick={() => onReview(booking)}>
                      {t("reservations.table.review")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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

      <RejectReservationDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        count={selectedCount}
        isSubmitting={isSubmitting}
        onConfirm={(reason) => {
          onBulkCancel(reason);
          setRejectDialogOpen(false);
        }}
      />
    </div>
  );
}
