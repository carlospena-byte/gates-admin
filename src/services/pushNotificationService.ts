/**
 * Push Notification Service ("Comunicados")
 * Rows live in `push_notifications`; the send-push-announcement edge function
 * delivers them (immediately when invoked here, or from pg_cron when scheduled).
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, unwrap, wrapResult, type ApiResult } from "./apiResult";
import { typed } from "./bulletinService";
import type {
  CreatePushNotificationInput,
  PushNotification,
  PushNotificationWithAuthor,
} from "@/types/pushNotification.types";

// The generated Database types predate this table, so go through an untyped client.
const db = () => requireSupabase() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

function list(residentialId: string): Promise<ApiResult<PushNotificationWithAuthor[]>> {
  return wrapResult("Failed to list notifications", async () => {
    const rows = await unwrap<PushNotificationWithAuthor[]>(
      typed<PushNotificationWithAuthor[]>(
        db()
          .from("push_notifications")
          .select("*, profiles:created_by(email)")
          .eq("residential_id", residentialId)
          .order("created_at", { ascending: false }),
      ),
    );
    return rows ?? [];
  });
}

function create(input: CreatePushNotificationInput): Promise<ApiResult<PushNotification>> {
  return wrapResult("Failed to create notification", () =>
    unwrap<PushNotification>(
      typed<PushNotification>(
        db()
          .from("push_notifications")
          .insert({
            residential_id: input.residentialId,
            title: input.title,
            body: input.body,
            destination: input.destination,
            bulletin_id: input.destination === "bulletin" ? input.bulletinId : null,
            audience: input.audience,
            unit_ids: input.audience === "units" ? input.unitIds : [],
            location_ids: input.audience === "units" ? input.locationIds : [],
            scheduled_at: input.scheduledAt,
            created_by: input.createdBy,
          })
          .select()
          .single(),
      ),
    ),
  );
}

// Delivers a row now. The function claims it atomically, so racing the
// cron is safe.
function send(id: string): Promise<ApiResult<{ sent: number; failed: number; recipients: number }>> {
  return wrapResult("Failed to send notification", async () => {
    const { data, error } = await requireSupabase().functions.invoke<{
      results?: { sent?: number; failed?: number; recipients?: number; error?: string }[];
      error?: string;
    }>("send-push-announcement", { body: { pushId: id } });
    if (error) {
      // functions.invoke hides the function's own message behind a generic
      // error; the JSON body (when present) says what actually went wrong.
      const context = (error as { context?: Response }).context;
      const detail = context ? await context.json().then((j: { error?: string }) => j.error).catch(() => null) : null;
      throw new ApiError(detail ?? error.message);
    }
    if (data?.error) throw new ApiError(data.error);
    const result = data?.results?.[0];
    if (result?.error) throw new ApiError(result.error);
    return { sent: result?.sent ?? 0, failed: result?.failed ?? 0, recipients: result?.recipients ?? 0 };
  });
}

function remove(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete notification", async () => {
    await unwrap<void>(db().from("push_notifications").delete().eq("id", id));
  });
}

export const pushNotificationService = { list, create, send, delete: remove };
