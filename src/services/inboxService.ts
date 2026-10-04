/**
 * Inbox service — the "what needs me right now" queries behind the Today
 * inbox on the dashboard, the sidebar badges and the notifications bell.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

export interface PendingCounts {
  payments: number;
  incidents: number;
  reservations: number;
  /** Open admin alerts (e.g. a paid booking the resident cancelled). */
  alerts: number;
}

export interface AdminAlertPayment {
  id: string;
  amount: number;
  method: "cash" | "transfer" | "check" | "other" | null;
  reference: string | null;
  paid_on: string;
}

export interface AdminAlert {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  installment_id: string | null;
  /** The action was taken (e.g. the paid booking's payment was voided). */
  resolved_at: string | null;
  read_at: string | null;
  archived_at: string | null;
  /** Comment left by the admin who voided the payments. */
  resolution_note: string | null;
  details: {
    resident?: string;
    unit?: string | null;
    amenity?: string;
    booking_start?: string;
    paid_total?: number;
    payments?: AdminAlertPayment[];
  };
}

// admin_alerts isn't in the generated types yet (same escape hatch as billingService).
const alertsTable = () => (requireSupabase() as any).from("admin_alerts"); // eslint-disable-line @typescript-eslint/no-explicit-any

export interface PendingPayment {
  id: string;
  amount: number;
  due_date: string;
  proof_url: string | null;
  tenantName: string | null;
  unitName: string | null;
}

export interface PendingReservation {
  id: string;
  amenity_id: string;
  unit_id: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
}

export const inboxService = {
  getPendingCounts(residentialId: string): Promise<ApiResult<PendingCounts>> {
    return wrapResult("Failed to load pending counts", async () => {
      const client = requireSupabase();
      const [payments, incidents, reservations, alerts] = await Promise.all([
        client
          .from("unit_rental_payments")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("status", "pending")
          .not("proof_url", "is", null),
        client
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("status", "new"),
        client
          .from("amenity_bookings")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("status", "pending"),
        alertsTable()
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .is("read_at", null)
          .is("archived_at", null),
      ]);
      for (const result of [payments, incidents, reservations, alerts]) {
        if (result.error) throw result.error;
      }
      return {
        payments: payments.count ?? 0,
        incidents: incidents.count ?? 0,
        reservations: reservations.count ?? 0,
        alerts: alerts.count ?? 0,
      };
    });
  },

  listPendingPayments(residentialId: string): Promise<ApiResult<PendingPayment[]>> {
    return wrapResult("Failed to load pending payments", async () => {
      const rows = await unwrap<Record<string, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
        requireSupabase()
          .from("unit_rental_payments")
          .select("id, amount, due_date, proof_url, unit_rentals(tenant_name, units(name))")
          .eq("residential_id", residentialId)
          .eq("status", "pending")
          .not("proof_url", "is", null)
          .order("due_date", { ascending: true })
          .limit(50),
      );
      return (rows ?? []).map((row) => ({
        id: row.id as string,
        amount: Number(row.amount ?? 0),
        due_date: row.due_date as string,
        proof_url: (row.proof_url as string | null) ?? null,
        tenantName: row.unit_rentals?.tenant_name ?? null,
        unitName: row.unit_rentals?.units?.name ?? null,
      }));
    });
  },

  listPendingReservations(residentialId: string): Promise<ApiResult<PendingReservation[]>> {
    return wrapResult("Failed to load pending reservations", async () => {
      const rows = await unwrap<PendingReservation[]>(
        requireSupabase()
          .from("amenity_bookings")
          .select("id, amenity_id, unit_id, start_time, end_time, notes")
          .eq("residential_id", residentialId)
          .eq("status", "pending")
          .order("start_time", { ascending: true })
          .limit(50),
      );
      return rows ?? [];
    });
  },

  /** Newest first, archived ones included so the inbox can filter them client-side. */
  listAdminAlerts(residentialId: string, limit = 200): Promise<ApiResult<AdminAlert[]>> {
    return wrapResult("Failed to load notifications", async () => {
      const rows = await unwrap<AdminAlert[]>(
        alertsTable()
          .select("id, kind, title, body, created_at, installment_id, resolved_at, read_at, archived_at, resolution_note, details")
          .eq("residential_id", residentialId)
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return rows ?? [];
    });
  },

  setAdminAlertsRead(ids: string[], read: boolean): Promise<ApiResult<void>> {
    return wrapResult("Failed to update notifications", () =>
      unwrap<void>(alertsTable().update({ read_at: read ? new Date().toISOString() : null }).in("id", ids)),
    );
  },

  setAdminAlertsArchived(ids: string[], archived: boolean): Promise<ApiResult<void>> {
    return wrapResult("Failed to update notifications", () =>
      unwrap<void>(
        alertsTable()
          .update(archived ? { archived_at: new Date().toISOString(), read_at: new Date().toISOString() } : { archived_at: null })
          .in("id", ids),
      ),
    );
  },

  /**
   * Voids every payment of the paid booking an alert is about, recording the
   * admin's comment. Resolves the alert and cancels the booking's installment.
   * Resolves with how many payments were voided.
   */
  voidBookingPayments(alertId: string, note: string): Promise<ApiResult<number>> {
    return wrapResult("Failed to void payments", async () => {
      const count = await unwrap<number>(
        (requireSupabase() as any).rpc("void_booking_payments", { _alert_id: alertId, _note: note }), // eslint-disable-line @typescript-eslint/no-explicit-any
      );
      return count ?? 0;
    });
  },
};
