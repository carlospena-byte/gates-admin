/**
 * Types for the Cobranza (recurring billing) screens. Installments come from
 * the v_charge_installments view, which adds the computed late fee, balance
 * and overdue flag on top of the stored row.
 */

export type InstallmentStatus = "pending" | "partial" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "transfer" | "check" | "other";

export interface Installment {
  id: string;
  residential_id: string;
  charge_id: string;
  unit_id: string;
  /** First day of the billed month (YYYY-MM-DD). */
  period: string;
  base_amount: number;
  due_date: string;
  status: InstallmentStatus;
  paid_amount: number;
  paid_at: string | null;
  notes: string | null;
  charge_name: string;
  unit_name: string;
  unit_location_id: string | null;
  late_fee: number;
  total_due: number;
  balance: number;
  is_overdue: boolean;
  days_overdue: number;
}

export interface ChargePayment {
  id: string;
  installment_id: string;
  amount: number;
  paid_on: string;
  method: PaymentMethod | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface NewChargePayment {
  residential_id: string;
  installment_id: string;
  amount: number;
  paid_on: string;
  method: PaymentMethod | null;
  reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

export interface BillingSummary {
  period: string;
  installments: number;
  billed: number;
  collected: number;
  paid_count: number;
  pending_current: number;
  overdue_balance: number;
  overdue_late_fees: number;
  overdue_installments: number;
  overdue_units: number;
  units_multiple: number;
  trend: { period: string; billed: number; collected: number }[];
}

export interface DelinquentUnit {
  unit_id: string;
  unit_name: string;
  unit_location_id: string | null;
  overdue_count: number;
  overdue_balance: number;
  late_fees: number;
  oldest_due_date: string;
  max_days_overdue: number;
  charge_names: string[];
}

export interface HistoryFilters {
  unitId?: string;
  chargeId?: string;
  /** Inclusive YYYY-MM bounds on the billed month. */
  fromPeriod?: string;
  toPeriod?: string;
}
