/**
 * Right-side sheet showing the full detail of a single amenity booking,
 * with approve/cancel actions — the drill-down the plain table row can't
 * fit (full notes, timestamps, requester) plus the status transitions the
 * table's inline "Cancelar" action didn't expose (approve). Layout mirrors
 * the resident app's own reservation-detail bottom sheet: a date/time card
 * up top, a two-column requester/unit block, then notes.
 */

import { useState } from "react";
import { IconCalendarEvent, IconCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { cn } from "@/lib/utils";
import { formatReservationDateLabel, formatReservationTimeLabel } from "@/lib/reservationFormat";
import { RejectReservationDialog } from "@/components/reservations/RejectReservationDialog";
import { useI18n } from "@/i18n/useI18n";
import type { AmenityBookingStatus, AmenityBookingWithUser } from "@/types/amenities.types";

const STATUS_DOT_STYLES: Record<AmenityBookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-secondary text-secondary-foreground",
  expired: "bg-secondary text-secondary-foreground",
};

interface ReservationDetailSheetProps {
  booking: AmenityBookingWithUser | null;
  unitLabel: string | undefined;
  bookerName: string | undefined;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  canManage: boolean;
  currentUserId: string | undefined;
  onApprove: (id: string) => void;
  onCancel: (id: string, reason?: string) => void;
}

export function ReservationDetailSheet({
  booking,
  unitLabel,
  bookerName,
  onOpenChange,
  isSubmitting,
  canManage,
  currentUserId,
  onApprove,
  onCancel,
}: ReservationDetailSheetProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "es" ? "es-ES" : "en-US";
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const canCancelBooking = Boolean(
    booking &&
      booking.status !== "cancelled" &&
      booking.status !== "expired" &&
      (canManage || booking.user_id === currentUserId),
  );
  const canApproveBooking = Boolean(canManage && booking?.status === "pending");

  const handleConfirmReject = (reason: string) => {
    if (!booking) return;
    onCancel(booking.id, reason);
    setRejectDialogOpen(false);
  };

  return (
    <Sheet open={Boolean(booking)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        {booking && (
          <>
            <SheetHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("reservations.detail.title")}
              </p>
              <SheetTitle className="text-2xl">{booking.amenities?.name ?? "—"}</SheetTitle>
              <div>
                <Badge className={cn("gap-1.5 border-transparent px-3 py-1", STATUS_DOT_STYLES[booking.status])}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {t(`reservations.status.${booking.status}`)}
                </Badge>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 py-6">
              <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
                <IconCalendarEvent className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1.5">
                  <p className="text-base font-semibold">
                    {formatReservationDateLabel(booking.start_time, booking.end_time, locale)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatReservationTimeLabel(booking.start_time, booking.end_time, locale)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("reservations.table.bookedBy")}
                  </p>
                  <p className="text-sm text-foreground">{bookerName ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("common.unit")}
                  </p>
                  <p className="text-sm text-foreground">{unitLabel ?? booking.units?.name ?? "—"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("common.notes")}
                </p>
                <p className="text-sm text-foreground">{booking.notes ?? t("reservations.detail.noNotes")}</p>
              </div>

              {booking.status === "cancelled" && booking.rejection_reason && (
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("reservations.reject.reasonLabel")}
                  </p>
                  <p className="text-sm text-foreground">{booking.rejection_reason}</p>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t("reservations.detail.createdAt")}:{" "}
                {new Date(booking.created_at).toLocaleString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {(canCancelBooking || canApproveBooking) && (
              <div className="flex gap-2 border-t pt-4">
                {canCancelBooking && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRejectDialogOpen(true)}
                    disabled={isSubmitting}
                  >
                    {t("reservations.detail.cancel")}
                  </Button>
                )}
                {canApproveBooking && (
                  <Button className="flex-1" onClick={() => onApprove(booking.id)} disabled={isSubmitting}>
                    {isSubmitting ? <Spinner size="sm" /> : <IconCheck className="h-4 w-4" />}
                    {t("reservations.detail.approve")}
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>

      <RejectReservationDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        count={1}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmReject}
      />
    </Sheet>
  );
}
