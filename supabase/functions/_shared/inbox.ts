// Records the in-app notification inbox (public.user_notifications) behind the
// bell in the mobile app. Called by the push edge functions next to their FCM
// send, so every push is also listed in the app, including for recipients with
// no registered device.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface InboxNotification {
  userId: string;
  residentialId: string | null;
  type: string;
  title: string;
  body: string;
  /** Same payload as the push `data`, so a tap routes identically. */
  data: Record<string, string>;
}

/**
 * Inserts one row per notification. Never throws: a failed inbox write must not
 * fail (or, for claimed rows, un-send) the push itself, so errors are logged.
 */
export async function recordNotifications(service: SupabaseClient, items: InboxNotification[]): Promise<void> {
  for (let i = 0; i < items.length; i += 500) {
    const { error } = await service.from("user_notifications").insert(
      items.slice(i, i + 500).map((n) => ({
        user_id: n.userId,
        residential_id: n.residentialId,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
      })),
    );
    if (error) console.error(`[inbox] insert failed: ${error.message}`);
  }
}
