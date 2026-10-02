// send-bulletin-notification
// Pushes "new bulletin" to every resident of a residential, with a data
// payload the mobile app uses to open that bulletin on tap. Authorization is
// the caller's own JWT: only an owner/admin of the bulletin's residential
// (or a platform admin) may notify, and only for a published bulletin.
// `notified_at` makes it one-shot per bulletin, so republishing after an
// unpublish never pushes residents twice.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendPush, type ServiceAccount } from "../_shared/fcm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let bulletinId: string | undefined;
  try {
    bulletinId = ((await req.json()) as { bulletinId?: string }).bulletinId;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!bulletinId) {
    return Response.json({ error: "bulletinId is required" }, { status: 400 });
  }

  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // RLS lets an admin see the bulletin whatever its status; the explicit
  // admin check below is what stops a plain resident (who can see published
  // bulletins) from triggering a push.
  const { data: bulletin, error: bulletinError } = await asCaller
    .from("bulletins")
    .select("id, residential_id, title, status, notified_at")
    .eq("id", bulletinId)
    .maybeSingle();
  if (bulletinError) {
    return Response.json({ error: bulletinError.message }, { status: 500 });
  }
  if (!bulletin) {
    return Response.json({ error: "Bulletin not found" }, { status: 404 });
  }

  const { data: isAdmin } = await asCaller.rpc("is_residential_admin", {
    _residential_id: bulletin.residential_id,
  });
  const { data: isPlatformAdmin } = await asCaller.rpc("is_platform_admin");
  if (!isAdmin && !isPlatformAdmin) {
    return Response.json({ error: "Only residential admins can notify" }, { status: 403 });
  }

  if (bulletin.status !== "published") {
    return Response.json({ error: "Bulletin is not published" }, { status: 409 });
  }
  if (bulletin.notified_at) {
    return Response.json({ sent: 0, failed: 0, alreadyNotified: true });
  }

  // Checked before claiming notified_at so a missing config can be fixed
  // and the push retried, instead of burning the one-shot flag.
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return Response.json(
      { error: "Push is not configured (set FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON)" },
      { status: 503 },
    );
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Claim the one-shot flag before sending: a concurrent second call sees it
  // already set and returns instead of double-pushing.
  const { data: claimed } = await service
    .from("bulletins")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", bulletin.id)
    .is("notified_at", null)
    .select("id");
  if (!claimed?.length) {
    return Response.json({ sent: 0, failed: 0, alreadyNotified: true });
  }

  try {
    const { data: members, error: membersError } = await service
      .from("unit_members")
      .select("user_id")
      .eq("residential_id", bulletin.residential_id);
    if (membersError) {
      throw new Error(membersError.message);
    }
    const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
    if (!userIds.length) {
      return Response.json({ sent: 0, failed: 0, recipients: 0 });
    }

    const { data: tokenRows, error: tokensError } = await service
      .from("device_tokens")
      .select("id, token")
      .in("user_id", userIds);
    if (tokensError) {
      throw new Error(tokensError.message);
    }
    if (!tokenRows?.length) {
      return Response.json({ sent: 0, failed: 0, recipients: userIds.length });
    }

    const accessToken = await getFcmAccessToken(JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount);
    const result = await sendPush({
      projectId: FCM_PROJECT_ID,
      accessToken,
      tokens: tokenRows,
      title: "Nuevo boletín",
      body: bulletin.title,
      data: { type: "bulletin", bulletin_id: bulletin.id, residential_id: bulletin.residential_id },
    });

    if (result.deadTokenIds.length) {
      await service.from("device_tokens").delete().in("id", result.deadTokenIds);
    }

    return Response.json({
      sent: result.sent,
      failed: result.failed,
      invalidTokensRemoved: result.deadTokenIds.length,
      recipients: userIds.length,
    });
  } catch (error) {
    // Nothing was delivered: release the claim so the admin can retry.
    await service.from("bulletins").update({ notified_at: null }).eq("id", bulletin.id);
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
