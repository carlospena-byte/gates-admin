/**
 * Dashboard Metrics Service
 * One call, several lightweight parallel queries (count-only via
 * {count: 'exact', head: true} — no row data fetched) backing the
 * "needs attention" stat row on the residential dashboard.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, type ApiResult } from "./apiResult";

export interface OperationalMetrics {
  activeProperties: number;
  activeResidents: number;
  visitorsToday: number;
  visitorsInside: number;
  reservationsToday: number;
  openIncidents: number;
  paymentsPendingValidation: number;
  pendingAmount: number;
}

export const dashboardMetricsService = {
  getOperationalMetrics(residentialId: string): Promise<ApiResult<OperationalMetrics>> {
    return wrapResult("Failed to load dashboard metrics", async () => {
      const client = requireSupabase();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [
        propertiesRes,
        residentsRes,
        visitorsTodayRes,
        visitorsInsideRes,
        reservationsTodayRes,
        openIncidentsRes,
        paymentsPendingRes,
        pendingAmountRes,
      ] = await Promise.all([
        client
          .from("units")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("is_active", true),
        client
          .from("unit_residents")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("is_active", true),
        client
          .from("visitors")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .gte("valid_from", todayStart.toISOString())
          .lte("valid_from", todayEnd.toISOString()),
        client
          .from("visitors")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("status", "inside"),
        client
          .from("amenity_bookings")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .neq("status", "cancelled")
          .gte("start_time", todayStart.toISOString())
          .lte("start_time", todayEnd.toISOString()),
        client
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .in("status", ["new", "in_progress"]),
        client
          .from("unit_rental_payments")
          .select("id", { count: "exact", head: true })
          .eq("residential_id", residentialId)
          .eq("status", "pending")
          .not("proof_url", "is", null),
        client
          .from("unit_rental_payments")
          .select("amount")
          .eq("residential_id", residentialId)
          .eq("status", "pending"),
      ]);

      for (const result of [
        propertiesRes,
        residentsRes,
        visitorsTodayRes,
        visitorsInsideRes,
        reservationsTodayRes,
        openIncidentsRes,
        paymentsPendingRes,
        pendingAmountRes,
      ]) {
        if (result.error) throw result.error;
      }

      const pendingAmount = (pendingAmountRes.data ?? []).reduce(
        (sum, row) => sum + Number(row.amount ?? 0),
        0,
      );

      return {
        activeProperties: propertiesRes.count ?? 0,
        activeResidents: residentsRes.count ?? 0,
        visitorsToday: visitorsTodayRes.count ?? 0,
        visitorsInside: visitorsInsideRes.count ?? 0,
        reservationsToday: reservationsTodayRes.count ?? 0,
        openIncidents: openIncidentsRes.count ?? 0,
        paymentsPendingValidation: paymentsPendingRes.count ?? 0,
        pendingAmount,
      } satisfies OperationalMetrics;
    });
  },
};
