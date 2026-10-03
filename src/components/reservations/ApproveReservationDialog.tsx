/**
 * Approval step for a reservation whose amenity costs money. Approving bills
 * the unit (the DB creates the installment); this dialog lets the admin
 * record the payment in the same step instead of hunting for the charge in
 * Cobranza afterwards. Unchecking "record payment" approves and leaves the
 * charge pending.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@/types/billing.types";

const METHODS: PaymentMethod[] = ["cash", "transfer", "check", "other"];

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export interface ApprovalPaymentFields {
  amount: number;
  paidOn: string;
  method: PaymentMethod;
  reference: string;
}

interface ApproveReservationDialogProps {
  open: boolean;
  amenityName: string;
  unitLabel: string | undefined;
  price: number;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  /** `payment` is null when the admin approves without recording one. */
  onConfirm: (payment: ApprovalPaymentFields | null) => Promise<void>;
}

export function ApproveReservationDialog({
  open,
  amenityName,
  unitLabel,
  price,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ApproveReservationDialogProps) {
  const { t } = useI18n();
  const [recordPayment, setRecordPayment] = useState(true);
  const [amount, setAmount] = useState(String(price));
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) return;
    setRecordPayment(true);
    setAmount(String(price));
    setPaidOn(today());
    setMethod("cash");
    setReference("");
  }, [open, price]);

  const amountNumber = Number(amount);
  const canSubmit = !recordPayment || (amount.trim() !== "" && amountNumber > 0 && paidOn !== "");

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm(
      recordPayment ? { amount: amountNumber, paidOn, method, reference: reference.trim() } : null,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("reservations.approve.title")}</DialogTitle>
          <DialogDescription>
            {t("reservations.approve.description", {
              amenity: amenityName,
              unit: unitLabel ?? "—",
              price: formatCurrency(price),
            })}
          </DialogDescription>
        </DialogHeader>

        <Checkbox
          checked={recordPayment}
          onCheckedChange={setRecordPayment}
          disabled={isSubmitting}
          label={t("reservations.approve.recordPayment")}
        />

        {recordPayment && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("billing.payment.amount")}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
            <DatePicker
              mode="single"
              label={t("billing.payment.date")}
              value={paidOn}
              onChange={setPaidOn}
              disabled={isSubmitting}
            />
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} disabled={isSubmitting}>
              <SelectTrigger label={t("billing.payment.method")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {t(`billing.method.${m}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              label={t("billing.payment.reference")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : recordPayment ? (
              t("reservations.approve.confirmWithPayment")
            ) : (
              t("reservations.approve.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
