/**
 * Marks several installments as paid in full in one go: one payment per
 * installment for its whole current balance (late fee included), all with the
 * same date and method.
 */

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
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
import { formatCurrency } from "@/lib/utils";
import type { Installment, PaymentMethod } from "@/types/billing.types";
import { DatePicker } from "@/components/ui/date-picker";

const METHODS: PaymentMethod[] = ["cash", "transfer", "check", "other"];

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface BulkPayDialogProps {
  open: boolean;
  installments: Installment[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (fields: { paidOn: string; method: PaymentMethod; reference: string }) => Promise<boolean>;
}

export function BulkPayDialog({ open, installments, isSubmitting, onOpenChange, onConfirm }: BulkPayDialogProps) {
  const { t } = useI18n();
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!open) return;
    setPaidOn(today());
    setMethod("cash");
    setReference("");
  }, [open]);

  const total = installments.reduce((sum, i) => sum + i.balance, 0);

  const handleConfirm = async () => {
    const ok = await onConfirm({ paidOn, method, reference: reference.trim() });
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.bulk.title", { count: installments.length })}</DialogTitle>
          <DialogDescription>{t("billing.bulk.description", { total: formatCurrency(total) })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="sm:col-span-2">
            <Input
              label={t("billing.payment.reference")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting || !paidOn || installments.length === 0}>
            {isSubmitting ? <Spinner size="sm" /> : t("billing.bulk.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
