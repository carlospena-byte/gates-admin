/**
 * Access Log Service
 * Check-in/check-out actions — not flat CRUD, so hand-written rather than
 * built on createCrudService. Each call also flips the visitor's status,
 * keeping that transition in one place instead of scattered across the UI.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

export interface AccessLogEntry {
  id: string;
  visitor_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
}

async function checkIn(
  visitorId: string,
  residentialId: string,
  gateName?: string | null,
): Promise<ApiResult<void>> {
  return wrapResult("Failed to check in visitor", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();

    await unwrap<null>(
      client.from("access_logs").insert({
        residential_id: residentialId,
        visitor_id: visitorId,
        gate_name: gateName ?? null,
        checked_in_by: userData.user?.id ?? null,
        checked_in_at: new Date().toISOString(),
      }),
    );

    await unwrap<null>(client.from("visitors").update({ status: "inside" }).eq("id", visitorId));

    // Best-effort: the resident's app should update in real time via its own
    // Realtime subscription regardless, so a push failure here must not fail
    // the check-in itself.
    try {
      await client.functions.invoke("notify-visitor-checkin", { body: { visitorId } });
    } catch (error) {
      console.error("Failed to send check-in push notification", error);
    }
  });
}

async function checkOut(visitorId: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to check out visitor", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();

    // The most recent access log for this visitor that hasn't been checked
    // out yet — there can be more than one historical entry per visitor.
    const openLog = await unwrap<{ id: string } | null>(
      client
        .from("access_logs")
        .select("id")
        .eq("visitor_id", visitorId)
        .is("checked_out_at", null)
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );

    if (openLog) {
      await unwrap<null>(
        client
          .from("access_logs")
          .update({ checked_out_by: userData.user?.id ?? null, checked_out_at: new Date().toISOString() })
          .eq("id", openLog.id),
      );
    }

    // A standing frequent visit (recurrence set, still inside its validity
    // window) is a permanent authorization: leaving only closes the access
    // log entry, and the visit goes back to "scheduled" for its next arrival.
    const visitor = await unwrap<{ visit_type: string; recurrence: string | null; valid_until: string }>(
      client.from("visitors").select("visit_type, recurrence, valid_until").eq("id", visitorId).single(),
    );
    const isStanding =
      visitor.visit_type === "frequent" && visitor.recurrence !== null && new Date(visitor.valid_until) > new Date();

    await unwrap<null>(
      client
        .from("visitors")
        .update({ status: isStanding ? "scheduled" : "completed" })
        .eq("id", visitorId),
    );
  });
}

/** Movement history (newest first) for the given visitors — one row per entry. */
async function listByVisitors(visitorIds: string[]): Promise<ApiResult<AccessLogEntry[]>> {
  return wrapResult("Failed to load access logs", async () => {
    if (visitorIds.length === 0) return [];
    return unwrap<AccessLogEntry[]>(
      requireSupabase()
        .from("access_logs")
        .select("id, visitor_id, checked_in_at, checked_out_at, created_at")
        .in("visitor_id", visitorIds)
        .order("checked_in_at", { ascending: false })
        .limit(2000),
    );
  });
}

export const accessLogService = { checkIn, checkOut, listByVisitors };
