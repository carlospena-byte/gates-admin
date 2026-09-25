import { requireSupabase } from "../lib/supabaseClient";
import type { AuditLogWithActor } from "../types/audit.types";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

// ============================================================================
// Audit Log Service (read-only — rows are written by the DB trigger)
// ============================================================================

export const auditLogService = {
  listByResidential(residentialId: string, limit = 200): Promise<ApiResult<AuditLogWithActor[]>> {
    return wrapResult("Failed to list audit logs", async () => {
      // audit_logs.action is CHECK-constrained to INSERT/UPDATE/DELETE in
      // SQL, but the generator only sees `text` — cast the generic query
      // builder response to the narrower AuditAction union we actually get.
      const query = requireSupabase()
        .from("audit_logs")
        .select("*, profiles:actor_user_id(email)")
        .eq("residential_id", residentialId)
        .order("created_at", { ascending: false })
        .limit(limit) as unknown as PromiseLike<{ data: AuditLogWithActor[] | null; error: unknown }>;

      const rows = await unwrap<AuditLogWithActor[]>(query);
      return rows ?? [];
    });
  },

  /**
   * Every audit_logs row, across every residential (plus the residential_id
   * = null rows for profiles/platform_admins) — only platform admins can
   * see this per the "audit_logs: platform admin all" RLS policy.
   */
  listPlatform(limit = 200): Promise<ApiResult<AuditLogWithActor[]>> {
    return wrapResult("Failed to list platform audit logs", async () => {
      const query = requireSupabase()
        .from("audit_logs")
        .select("*, profiles:actor_user_id(email)")
        .order("created_at", { ascending: false })
        .limit(limit) as unknown as PromiseLike<{ data: AuditLogWithActor[] | null; error: unknown }>;

      const rows = await unwrap<AuditLogWithActor[]>(query);
      return rows ?? [];
    });
  },
};
