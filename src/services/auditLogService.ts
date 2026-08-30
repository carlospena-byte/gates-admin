import { requireSupabase } from "../lib/supabaseClient";
import type { AuditLogWithActor } from "../types/audit.types";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

// ============================================================================
// Audit Log Service (read-only — rows are written by the DB trigger)
// ============================================================================

export const auditLogService = {
  listByResidential(residentialId: string, limit = 200): Promise<ApiResult<AuditLogWithActor[]>> {
    return wrapResult("Failed to list audit logs", async () => {
      const rows = await unwrap<AuditLogWithActor[]>(
        requireSupabase()
          .from("audit_logs")
          .select("*, profiles:actor_user_id(email)")
          .eq("residential_id", residentialId)
          .order("created_at", { ascending: false })
          .limit(limit),
      );
      return rows ?? [];
    });
  },
};
