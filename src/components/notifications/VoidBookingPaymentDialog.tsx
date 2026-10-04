/**
 * Opened from a "booking cancelled with payment" notification: shows the
 * payments currently recorded for that booking and voids them with an
 * optional comment (e.g. how the refund was handled), via the
 * void_booking_payments RPC.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/LoadingStates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { formatCurrency } from "@/lib/utils";
import { billingService, inboxService, type AdminAlert } from "@/services";
import type { ChargePayment } from "@/types/billing.types";

interface VoidBookingPaymentDialogProps {
  alert: AdminAlert | null;
  onOpenChange: (open: boolean) => void;
  /** Called after the payments were voided so the inbox can refresh. */
  onVoided: () => void;
}

export function VoidBookingPaymentDialog({ alert, onOpenChange, onVoided }: VoidBookingPaymentDialogProps) {
  const { t } = useI18n();
  const [payments, setPayments] = useState<ChargePayment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comment, setComment] = useState("");

  const alertId = alert?.id;
  const installmentId = alert?.installment_id;

  // Always read the live payments: they may have changed since the alert was raised.
  useEffect(() => {
    if (!alertId || !installmentId) return;
    let cancelled = false;
    setComment("");
    setPayments([]);
    setIsLoading(true);
    void billingService.listPayments(installmentId).then((result) => {
      if (cancelled) return;
      if (result.success) setPayments(result.data);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [alertId, installmentId]);

  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const canSubmit = payments.length > 0 && !isSubmitting && !isLoading;

  const handleConfirm = async () => {
    if (!alert || !canSubmit) return;
    setIsSubmitting(true);
    const result = await inboxService.voidBookingPayments(alert.id, comment.trim());
    setIsSubmitting(false);
    if (!result.success) {
      toast.error(t("notifications.void.error"));
      return;
    }
    toast.success(t("notifications.void.success"));
    onVoided();
    onOpenChange(false);
  };

  const details: AdminAlert["details"] = alert?.details ?? {};

  return (
    <Dialog open={alert !== null} onOpenChange={(open) => !isSubmitting && onOpenChange(open)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("notifications.void.title")}</DialogTitle>
          <DialogDescription>
            {t("notifications.void.description", {
              resident: details.resident ?? "—",
              unit: details.unit ?? t("inbox.alert.noUnit"),
              amenity: details.amenity ?? "—",
              when: details.booking_start ?? "—",
            })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            {t("notifications.void.loading")}
          </div>
        ) : payments.length === 0 ? (
          <p className="rounded-md border p-3 text-sm text-muted-foreground">{t("notifications.void.none")}</p>
        ) : (
          <div className="divide-y rounded-md border text-sm">
            {payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="font-medium">{formatCurrency(payment.amount)}</span>
                <span className="text-muted-foreground">
                  {[
                    payment.method ? t(`billing.method.${payment.method}` as MessageKey) : null,
                    payment.reference ? `ref. ${payment.reference}` : null,
                    payment.paid_on,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/50 p-3 font-medium">
              <span>{t("notifications.paidTotal")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        <Textarea
          label={t("notifications.void.comment")}
          helper={t("notifications.void.commentHelper")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isSubmitting || payments.length === 0}
          maxLength={500}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canSubmit}>
            {isSubmitting ? <Spinner size="sm" /> : t("notifications.void.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
