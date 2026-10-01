/**
 * Confirms a reservation rejection (single or bulk) with an optional note
 * explaining why — shared by the detail sheet's "Rechazar" button and the
 * table's bulk-reject action so both go through the same prompt.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/LoadingStates";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/useI18n";

interface RejectReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  isSubmitting: boolean;
  onConfirm: (reason: string) => void;
}

export function RejectReservationDialog({
  open,
  onOpenChange,
  count,
  isSubmitting,
  onConfirm,
}: RejectReservationDialogProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setReason("");
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reservations.reject.title", { count })}</DialogTitle>
          <DialogDescription>{t("reservations.reject.description")}</DialogDescription>
        </DialogHeader>

        <Textarea
          label={t("reservations.reject.reasonLabel")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("reservations.reject.reasonPlaceholder")}
          disabled={isSubmitting}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => {
              onConfirm(reason);
              setReason("");
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Spinner size="sm" /> : t("reservations.reject.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
