/**
 * Platform Metrics Service
 * Same shape as dashboardMetricsService, but aggregated across every
 * residential instead of scoped to one — backs the platform admin dashboard.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, type ApiResult } from "./apiResult";

export interface PlatformMetrics {
  totalResidentials: number;
  activeResidentials: number;
  totalUnits: number;
  totalResidents: number;
  openIncidents: number;
  paymentsPendingValidation: number;
}

export const platformMetricsService = {
  getPlatformMetrics(): Promise<ApiResult<PlatformMetrics>> {
    return wrapResult("Failed to load platform metrics", async () => {
      const client = requireSupabase();

      const [
        totalResidentialsRes,
        activeResidentialsRes,
        unitsRes,
        residentsRes,
        openIncidentsRes,
        paymentsPendingRes,
      ] = await Promise.all([
        client.from("residentials").select("id", { count: "exact", head: true }),
        client.from("residentials").select("id", { count: "exact", head: true }).eq("is_active", true),
        client.from("units").select("id", { count: "exact", head: true }).eq("is_active", true),
        client.from("unit_residents").select("id", { count: "exact", head: true }).eq("is_active", true),
        client.from("incidents").select("id", { count: "exact", head: true }).in("status", ["new", "in_progress"]),
        client
          .from("unit_rental_payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .not("proof_url", "is", null),
      ]);

      for (const result of [
        totalResidentialsRes,
        activeResidentialsRes,
        unitsRes,
        residentsRes,
        openIncidentsRes,
        paymentsPendingRes,
      ]) {
        if (result.error) throw result.error;
      }

      return {
        totalResidentials: totalResidentialsRes.count ?? 0,
        activeResidentials: activeResidentialsRes.count ?? 0,
        totalUnits: unitsRes.count ?? 0,
        totalResidents: residentsRes.count ?? 0,
        openIncidents: openIncidentsRes.count ?? 0,
        paymentsPendingValidation: paymentsPendingRes.count ?? 0,
      } satisfies PlatformMetrics;
    });
  },
};
