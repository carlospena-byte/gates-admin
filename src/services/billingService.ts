/**
 * Billing Service
 * Reads installments (through the v_charge_installments view, which carries
 * the computed late fee / balance / overdue flag), records the manual
 * payments (abonos) an admin enters, and fetches the server-side KPIs and
 * delinquency report.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type {
  BillingSummary,
  ChargePayment,
  DelinquentUnit,
  HistoryFilters,
  Installment,
  NewChargePayment,
  PaymentImportResponse,
  PaymentImportRow,
} from "@/types/billing.types";

// The view isn't in the generated table types the CRUD factory is keyed on, and
// its numeric columns arrive as numbers; the cast is scoped to this module.
const db = () => requireSupabase() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const HISTORY_LIMIT = 1000;

/** "2026-10" -> "2026-10-01" */
export function monthToPeriod(month: string): string {
  return `${month}-01`;
}

function listByPeriod(residentialId: string, period: string): Promise<ApiResult<Installment[]>> {
  return wrapResult("Failed to load installments", async () => {
    const rows = await unwrap<Installment[]>(
      db()
        .from("v_charge_installments")
        .select("*")
        .eq("residential_id", residentialId)
        .eq("period", period)
        .order("unit_name"),
    );
    return rows ?? [];
  });
}

function listHistory(residentialId: string, filters: HistoryFilters): Promise<ApiResult<Installment[]>> {
  return wrapResult("Failed to load billing history", async () => {
    let query = db().from("v_charge_installments").select("*").eq("residential_id", residentialId);
    if (filters.unitId) query = query.eq("unit_id", filters.unitId);
    if (filters.chargeId) query = query.eq("charge_id", filters.chargeId);
    if (filters.fromPeriod) query = query.gte("period", monthToPeriod(filters.fromPeriod));
    if (filters.toPeriod) query = query.lte("period", monthToPeriod(filters.toPeriod));
    const rows = await unwrap<Installment[]>(
      query.order("period", { ascending: false }).order("unit_name").limit(HISTORY_LIMIT),
    );
    return rows ?? [];
  });
}

function listPayments(installmentId: string): Promise<ApiResult<ChargePayment[]>> {
  return wrapResult("Failed to load payments", async () => {
    const rows = await unwrap<ChargePayment[]>(
      db()
        .from("charge_payments")
        .select("id, installment_id, amount, paid_on, method, reference, notes, created_at")
        .eq("installment_id", installmentId)
        .order("paid_on")
        .order("created_at"),
    );
    return rows ?? [];
  });
}

/**
 * Best effort: the payments are already recorded, so a failed push must not
 * surface as a failed payment.
 */
async function notifyPayments(paymentIds: string[]): Promise<void> {
  if (paymentIds.length === 0) return;
  try {
    // The function accepts at most 200 ids per call.
    for (let i = 0; i < paymentIds.length; i += 200) {
      await requireSupabase().functions.invoke("send-payment-notification", {
        body: { paymentIds: paymentIds.slice(i, i + 200) },
      });
    }
  } catch {
    /* push is a courtesy, never blocks recording */
  }
}

/** The installment an approved booking was billed as, or null when none was generated. */
function getByBooking(bookingId: string): Promise<ApiResult<Installment | null>> {
  return wrapResult("Failed to load booking charge", () =>
    unwrap<Installment | null>(
      db().from("v_charge_installments").select("*").eq("booking_id", bookingId).maybeSingle(),
    ),
  );
}

function addPayments(payments: NewChargePayment[]): Promise<ApiResult<void>> {
  if (payments.length === 0) return Promise.resolve({ success: true, data: undefined });
  return wrapResult("Failed to record payment", async () => {
    const rows = await unwrap<{ id: string }[]>(db().from("charge_payments").insert(payments).select("id"));
    await notifyPayments((rows ?? []).map((r) => r.id));
  });
}

/**
 * Validates (dryRun) or records a CSV import in one transaction. Invalid rows
 * never abort the batch; they come back in `results` with an error code. On a
 * real run, residents of the paid units are notified.
 */
function importPayments(
  residentialId: string,
  rows: PaymentImportRow[],
  dryRun: boolean,
): Promise<ApiResult<PaymentImportResponse>> {
  return wrapResult("Failed to import payments", async () => {
    const response = await unwrap<PaymentImportResponse>(
      db().rpc("import_charge_payments", { _residential_id: residentialId, _rows: rows, _dry_run: dryRun }),
    );
    if (!dryRun) await notifyPayments(response.payment_ids);
    return response;
  });
}

function deletePayment(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete payment", () => unwrap<void>(db().from("charge_payments").delete().eq("id", id)));
}

/** Cancels an installment (billed by mistake) or reopens a cancelled one. */
function setCancelled(installmentId: string, cancelled: boolean): Promise<ApiResult<void>> {
  return wrapResult("Failed to update installment", () =>
    unwrap<void>(
      requireSupabase().rpc("set_installment_cancelled", {
        _installment_id: installmentId,
        _cancelled: cancelled,
      }),
    ),
  );
}

function getSummary(residentialId: string, period: string): Promise<ApiResult<BillingSummary>> {
  return wrapResult("Failed to load billing summary", () =>
    unwrap<BillingSummary>(
      requireSupabase().rpc("billing_summary", { _residential_id: residentialId, _period: period }) as never,
    ),
  );
}

function listDelinquentUnits(residentialId: string): Promise<ApiResult<DelinquentUnit[]>> {
  return wrapResult("Failed to load delinquent units", async () => {
    const rows = await unwrap<DelinquentUnit[]>(
      requireSupabase().rpc("billing_delinquent_units", { _residential_id: residentialId }) as never,
    );
    return rows ?? [];
  });
}

export const billingService = {
  listByPeriod,
  listHistory,
  listPayments,
  getByBooking,
  addPayments,
  importPayments,
  deletePayment,
  setCancelled,
  getSummary,
  listDelinquentUnits,
  historyLimit: HISTORY_LIMIT,
};
