/**
 * Audit Log Types
 * Rows are written exclusively by the log_audit_event() DB trigger — see
 * supabase/migrations/20260101000000_baseline.sql. Nothing in the app ever
 * inserts into audit_logs directly.
 */

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface AuditLog {
  id: string;
  residential_id: string | null;
  table_name: string;
  record_id: string | null;
  action: AuditAction;
  actor_user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogWithActor extends AuditLog {
  profiles?: {
    email: string;
  } | null;
}
