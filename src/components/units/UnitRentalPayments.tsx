/**
 * Payment installments for a single rental — a short_term rental typically
 * has one row, a monthly rental gets one per period. Pending payments can
 * either be marked paid directly (cash/manual entry) or go through a
 * proof-of-payment flow: upload a receipt, then approve (-> paid) or
 * reject it.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconPaperclip } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon, PlusIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { formatCurrency } from "@/lib/utils";
import { unitRentalPaymentService } from "@/services";
import type { RentalPaymentStatus, UnitRentalPayment } from "@/types/unit-wizard.types";

const STATUS_VARIANT: Record<RentalPaymentStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
  rejected: "destructive",
};

function PaymentProofActions({
  payment,
  residentialId,
  isSubmitting,
  onBusyChange,
  onReload,
}: {
  payment: UnitRentalPayment;
  residentialId: string;
  isSubmitting: boolean;
  onBusyChange: (busy: boolean) => void;
  onReload: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    onBusyChange(true);
    const result = await unitRentalPaymentService.uploadProof(payment.id, residentialId, file);
    onBusyChange(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Proof uploaded");
    await onReload();
  };

  const handleViewProof = async () => {
    if (!payment.proof_url) return;
    const result = await unitRentalPaymentService.getSignedProofUrl(payment.proof_url);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  };

  const handleApprove = async () => {
    onBusyChange(true);
    const result = await unitRentalPaymentService.approve(payment.id);
    onBusyChange(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Payment approved");
    await onReload();
  };

  const handleReject = async () => {
    onBusyChange(true);
    const result = await unitRentalPaymentService.reject(payment.id);
    onBusyChange(false);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Payment rejected");
    await onReload();
  };

  if (!payment.proof_url) {
    return (
      <>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelected} />
        <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => fileInputRef.current?.click()}>
          <IconPaperclip className="h-4 w-4" /> <span className="ml-1">Attach proof</span>
        </Button>
      </>
    );
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={isSubmitting} onClick={handleViewProof}>
        View proof
      </Button>
      {payment.status === "pending" && (
        <>
          <Button size="sm" variant="default" disabled={isSubmitting} onClick={handleApprove}>
            Approve
          </Button>
          <Button size="sm" variant="destructive" disabled={isSubmitting} onClick={handleReject}>
            Reject
          </Button>
        </>
      )}
    </>
  );
}

export function UnitRentalPayments({
  rentalId,
  residentialId,
  canManage,
}: {
  rentalId: string;
  residentialId: string;
  canManage: boolean;
}) {
  const [payments, setPayments] = useState<UnitRentalPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = async () => {
    setIsLoading(true);
    const result = await unitRentalPaymentService.list(rentalId);
    if (result.success) {
      setPayments(result.data);
    } else {
      toast.error(result.error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentalId]);

  const handleAdd = async () => {
    if (!amount.trim() || !dueDate) {
      toast.error("Amount and due date are required");
      return;
    }

    setIsSubmitting(true);
    const result = await unitRentalPaymentService.create({
      residential_id: residentialId,
      rental_id: rentalId,
      amount: Number(amount),
      due_date: dueDate,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Payment added");
    setAmount("");
    setDueDate("");
    await load();
  };

  const handleMarkPaid = async (id: string) => {
    const result = await unitRentalPaymentService.update(id, {
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    await load();
  };

  const handleDelete = (id: string) => {
    confirmDeleteToast("this payment", async () => {
      const result = await unitRentalPaymentService.delete(id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Payments</p>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Spinner size="sm" />
        </div>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {payments.map((payment) => (
            <div key={payment.id} className="space-y-2 rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>{" "}
                  <span className="text-muted-foreground">due {payment.due_date}</span>
                  {payment.paid_at && (
                    <span className="text-muted-foreground"> · paid {payment.paid_at.slice(0, 10)}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={STATUS_VARIANT[payment.status]}>{payment.status}</Badge>
                  {canManage && (
                    <>
                      {payment.status === "pending" && !payment.proof_url && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(payment.id)}>
                          Mark Paid
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(payment.id)}>
                        <DeleteIcon />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {canManage && (payment.status === "pending" || payment.status === "rejected") && (
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentProofActions
                    payment={payment}
                    residentialId={residentialId}
                    isSubmitting={isSubmitting}
                    onBusyChange={setIsSubmitting}
                    onReload={load}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="flex items-end gap-2">
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Input
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button
            size="sm"
            aria-label="Add payment"
            onClick={handleAdd}
            disabled={isSubmitting || !amount.trim() || !dueDate}
          >
            {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
          </Button>
        </div>
      )}
    </div>
  );
}
