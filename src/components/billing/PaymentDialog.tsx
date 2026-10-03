/**
 * Records payments (abonos) against one installment and shows the ones
 * already recorded. Payments are manual — there's no payment processor — so
 * the admin enters what was received, when, and how.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { billingService } from "@/services";
import type { ChargePayment, Installment, PaymentMethod } from "@/types/billing.types";
import { DatePicker } from "@/components/ui/date-picker";

const METHODS: PaymentMethod[] = ["cash", "transfer", "check", "other"];

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

interface PaymentDialogProps {
  installment: Installment | null;
  unitLabel: string;
  canManage: boolean;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (fields: { amount: number; paidOn: string; method: PaymentMethod; reference: string }) => Promise<boolean>;
  onDeletePayment: (paymentId: string) => Promise<boolean>;
}

export function PaymentDialog({
  installment,
  unitLabel,
  canManage,
  isSubmitting,
  onOpenChange,
  onSubmit,
  onDeletePayment,
}: PaymentDialogProps) {
  const { t } = useI18n();
  const [payments, setPayments] = useState<ChargePayment[]>([]);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");

  const installmentId = installment?.id;
  const balance = installment?.balance ?? 0;
  const paidAmount = installment?.paid_amount ?? 0;

  // Reload the payment list (and reset the amount to the new balance) whenever
  // a different installment opens or its totals change after a mutation.
  useEffect(() => {
    if (!installmentId) return;
    setAmount(balance > 0 ? String(balance) : "");
    void (async () => {
      const result = await billingService.listPayments(installmentId);
      if (result.success) setPayments(result.data);
      else toast.error(result.error.message);
    })();
  }, [installmentId, balance, paidAmount]);

  useEffect(() => {
    if (!installmentId) return;
    setPaidOn(today());
    setMethod("cash");
    setReference("");
  }, [installmentId]);

  const amountNumber = Number(amount);
  const canSubmit = canManage && amount.trim() !== "" && amountNumber > 0 && paidOn !== "";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const ok = await onSubmit({ amount: amountNumber, paidOn, method, reference: reference.trim() });
    if (ok) setReference("");
  };

  const handleDelete = (payment: ChargePayment) => {
    confirmDeleteToast(`${formatCurrency(payment.amount)} · ${payment.paid_on}`, async () => {
      await onDeletePayment(payment.id);
    });
  };

  const open = installment !== null;
  const canRecord = canManage && installment !== null && installment.status !== "cancelled" && balance > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {installment && (
          <>
            <DialogHeader>
              <DialogTitle>{t("billing.payment.title", { charge: installment.charge_name })}</DialogTitle>
              <DialogDescription>
                {unitLabel} · {installment.period.slice(0, 7)}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border p-3 text-sm">
              <dt className="text-muted-foreground">{t("billing.payment.base")}</dt>
              <dd className="text-right">{formatCurrency(installment.base_amount)}</dd>
              <dt className="text-muted-foreground">{t("billing.payment.lateFee")}</dt>
              <dd className="text-right">{formatCurrency(installment.late_fee)}</dd>
              <dt className="text-muted-foreground">{t("billing.payment.paid")}</dt>
              <dd className="text-right">{formatCurrency(installment.paid_amount)}</dd>
              <dt className="font-medium">{t("billing.payment.balance")}</dt>
              <dd className="text-right font-medium">{formatCurrency(installment.balance)}</dd>
            </dl>

            {payments.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t("billing.payment.recorded")}</p>
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium">{formatCurrency(payment.amount)}</span>{" "}
                      <span className="text-muted-foreground">
                        {payment.paid_on}
                        {payment.method ? ` · ${t(`billing.method.${payment.method}`)}` : ""}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </span>
                    </div>
                    {canManage && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(payment)} disabled={isSubmitting}>
                        <DeleteIcon />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canRecord && (
              <div className="space-y-3">
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
                <p className="text-xs text-muted-foreground">{t("billing.payment.partialHelp")}</p>
                <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="w-full">
                  {isSubmitting ? <Spinner size="sm" /> : t("billing.payment.record")}
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
