/**
 * Reservation list — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as every other Manager table. List view only, no
 * calendar widget, per the audit's own "don't over-build this" guidance.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { cn } from "@/lib/utils";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type { AmenityBookingStatus, AmenityBookingWithUser } from "@/types/amenities.types";

const STATUS_STYLES: Record<AmenityBookingStatus, string> = {
  pending: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-secondary text-secondary-foreground",
};

interface ReservationTableProps {
  bookings: AmenityBookingWithUser[];
  isLoading: boolean;
  isSubmitting: boolean;
  currentUserId: string | undefined;
  canManage: boolean;
  onCancel: (id: string) => void;
}

export function ReservationTable({ bookings, isLoading, isSubmitting, currentUserId, canManage, onCancel }: ReservationTableProps) {
  const { t } = useI18n();
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
    defaultSortField: "start_time" as keyof AmenityBookingWithUser,
    itemsPerPage: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (bookings.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("reservations.table.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reservations.table.amenity")}</TableHead>
              <SortableTableHead field="start_time" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("reservations.table.start")}
              </SortableTableHead>
              <TableHead>{t("reservations.table.end")}</TableHead>
              <TableHead>{t("common.unit")}</TableHead>
              <TableHead>{t("reservations.table.bookedBy")}</TableHead>
              <TableHead>{t("common.notes")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBookings.map((booking) => {
              const canCancel = booking.status !== "cancelled" && (canManage || booking.user_id === currentUserId);
              return (
                <TableRow key={booking.id}>
                  <TableCell className="text-sm font-medium">{booking.amenities?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(booking.start_time).toLocaleString()}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(booking.end_time).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{booking.units?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{booking.profiles?.email ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{booking.notes ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={cn("border-transparent capitalize", STATUS_STYLES[booking.status])}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canCancel && (
                      <Button size="sm" variant="ghost" disabled={isSubmitting} onClick={() => onCancel(booking.id)}>
                        {t("common.cancel")}
                      </Button>
                    )}
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
    </div>
  );
}
