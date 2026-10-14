// send-incident-notification
// Pushes "your incident was updated" (status or priority changed) to the
// person who reported it. Called only by the `notify_incident_update` database
// trigger through pg_net, with the service-role key: the trigger already wrote
// the in-app inbox row and decided the text, so this function just delivers it
// to the recipient's registered devices.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendPush, type ServiceAccount } from "../_shared/fcm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

interface RequestBody {
  userId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  // Internal-only: the trigger is the sole caller, so the service-role key is
  // the credential. A user JWT must never be able to push to another user.
  if (req.headers.get("Authorization") !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!payload.userId || !payload.title || !payload.body) {
    return Response.json({ error: "userId, title and body are required" }, { status: 400 });
  }
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return Response.json(
      { error: "Push is not configured (set FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON)" },
      { status: 503 },
    );
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data: tokenRows, error } = await service
      .from("device_tokens")
      .select("id, token")
      .eq("user_id", payload.userId);
    if (error) throw new Error(error.message);
    if (!tokenRows?.length) return Response.json({ sent: 0, failed: 0 });

    const accessToken = await getFcmAccessToken(JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount);
    const result = await sendPush({
      projectId: FCM_PROJECT_ID,
      accessToken,
      tokens: tokenRows.map((t) => ({ id: t.id as string, token: t.token as string })),
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    if (result.deadTokenIds.length) {
      await service.from("device_tokens").delete().in("id", result.deadTokenIds);
    }
    return Response.json({ sent: result.sent, failed: result.failed });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
});
