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
}

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
      const [payments, incidents, reservations] = await Promise.all([
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
      ]);
      for (const result of [payments, incidents, reservations]) {
        if (result.error) throw result.error;
      }
      return {
        payments: payments.count ?? 0,
        incidents: incidents.count ?? 0,
        reservations: reservations.count ?? 0,
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
};
