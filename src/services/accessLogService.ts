/**
 * Access Log Service
 * Check-in/check-out actions — not flat CRUD, so hand-written rather than
 * built on createCrudService. Each call also flips the visitor's status,
 * keeping that transition in one place instead of scattered across the UI.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

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

    await unwrap<null>(client.from("visitors").update({ status: "completed" }).eq("id", visitorId));
  });
}

export const accessLogService = { checkIn, checkOut };
