// send-push-announcement
// Dispatches rows of `push_notifications` ("Comunicados"): a title + message
// with a deeplink destination the mobile app opens on tap.
//
// Two callers:
//  - an admin's JWT with `{ pushId }`: sends that row now (immediate sends and
//    "send now" on a scheduled row). Must be admin of the row's residential.
//  - the pg_cron job with the service-role key and `{}`: sends every row that
//    is `scheduled` and due.
// A row is claimed by flipping scheduled -> sending, so the admin call and the
// cron can never both send it.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendPush, type ServiceAccount } from "../_shared/fcm.ts";
import { recordNotifications } from "../_shared/inbox.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

const MAX_PER_CRON_RUN = 20;
// FCM and APNs both reject payloads over 4096 bytes (title + body + data).
const MAX_PAYLOAD_BYTES = 3800;

interface PushRow {
  id: string;
  residential_id: string;
  title: string;
  body: string;
  destination: string;
  bulletin_id: string | null;
  audience: "everyone" | "admins" | "units";
  unit_ids: string[];
  location_ids: string[];
}

// Keep in sync with `allowedPushRoute` in gates-app push_navigation.dart,
// which refuses any route not on its own allowlist.
function destinationRoute(row: PushRow): string | null {
  switch (row.destination) {
    case "bulletins":
      return "/bulletins";
    case "bulletin":
      return row.bulletin_id ? `/bulletins/${encodeURIComponent(row.bulletin_id)}` : null;
    case "amenities":
      return "/amenities";
    case "billing":
      return "/billing";
    case "incident_report":
      return "/incidents/report";
    case "new_visit":
      return "/visits/new";
    case "profile":
      return "/profile";
    default:
      return null; // home: opening the app is the destination
  }
}

/** Units placed at any of the chosen levels or anywhere beneath them. */
async function unitsInLevels(service: SupabaseClient, residentialId: string, locationIds: string[]): Promise<string[]> {
  const { data: locations, error } = await service
    .from("locations")
    .select("id, parent_id")
    .eq("residential_id", residentialId);
  if (error) throw new Error(error.message);

  const children = new Map<string, string[]>();
  for (const l of locations ?? []) {
    if (!l.parent_id) continue;
    children.set(l.parent_id, [...(children.get(l.parent_id) ?? []), l.id]);
  }
  const covered = new Set<string>();
  const queue = [...locationIds];
  while (queue.length) {
    const id = queue.pop()!;
    if (covered.has(id)) continue;
    covered.add(id);
    queue.push(...(children.get(id) ?? []));
  }

  const { data: units, error: unitsError } = await service
    .from("units")
    .select("id")
    .eq("residential_id", residentialId)
    .in("location_id", [...covered]);
  if (unitsError) throw new Error(unitsError.message);
  return (units ?? []).map((u) => u.id as string);
}

async function recipientUserIds(service: SupabaseClient, row: PushRow): Promise<string[]> {
  const ids = new Set<string>();
  if (row.audience === "admins") {
    const { data: admins, error } = await service
      .from("residential_users")
      .select("user_id")
      .eq("residential_id", row.residential_id)
      .in("role", ["admin", "owner"]);
    if (error) throw new Error(error.message);
    for (const a of admins ?? []) ids.add(a.user_id as string);
    const { data: residential, error: ownerError } = await service
      .from("residentials")
      .select("owner_user_id")
      .eq("id", row.residential_id)
      .maybeSingle();
    if (ownerError) throw new Error(ownerError.message);
    if (residential?.owner_user_id) ids.add(residential.owner_user_id as string);
  } else {
    let query = service.from("unit_members").select("user_id").eq("residential_id", row.residential_id);
    if (row.audience === "units") {
      const levelUnits = row.location_ids.length
        ? await unitsInLevels(service, row.residential_id, row.location_ids)
        : [];
      query = query.in("unit_id", [...new Set([...row.unit_ids, ...levelUnits])]);
    }
    const { data: members, error } = await query;
    if (error) throw new Error(error.message);
    for (const m of members ?? []) ids.add(m.user_id as string);
  }
  return [...ids];
}

/** Claims and sends one row. Returns its outcome; never throws. */
async function dispatch(service: SupabaseClient, row: PushRow, accessToken: string) {
  const { data: claimed } = await service
    .from("push_notifications")
    .update({ status: "sending" })
    .eq("id", row.id)
    .eq("status", "scheduled")
    .select("id");
  if (!claimed?.length) return { id: row.id, skipped: true };

  try {
    const userIds = await recipientUserIds(service, row);
    let tokens: { id: string; token: string }[] = [];
    if (userIds.length) {
      const { data, error } = await service.from("device_tokens").select("id, token").in("user_id", userIds);
      if (error) throw new Error(error.message);
      tokens = data ?? [];
    }

    const route = destinationRoute(row);
    const data: Record<string, string> = {
      type: "deeplink",
      push_id: row.id,
      residential_id: row.residential_id,
    };
    if (route) data.route = route;

    await recordNotifications(
      service,
      userIds.map((userId) => ({
        userId,
        residentialId: row.residential_id,
        type: "deeplink",
        title: row.title,
        body: row.body,
        data,
      })),
    );

    const payloadBytes = new TextEncoder().encode(JSON.stringify({ title: row.title, body: row.body, data })).length;
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      throw new Error(`Payload too large (${payloadBytes} bytes, max ${MAX_PAYLOAD_BYTES})`);
    }

    const result = tokens.length
      ? await sendPush({
          projectId: FCM_PROJECT_ID!,
          accessToken,
          tokens,
          title: row.title,
          body: row.body,
          data,
        })
      : { sent: 0, failed: 0, deadTokenIds: [] as string[] };

    if (result.deadTokenIds.length) {
      await service.from("device_tokens").delete().in("id", result.deadTokenIds);
    }

    await service
      .from("push_notifications")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipients: userIds.length,
        sent_count: result.sent,
        failed_count: result.failed,
        error: null,
      })
      .eq("id", row.id);
    return { id: row.id, sent: result.sent, failed: result.failed, recipients: userIds.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await service.from("push_notifications").update({ status: "failed", error: message }).eq("id", row.id);
    return { id: row.id, error: message };
  }
}

/**
 * True when the caller is the pg_cron job (service-role JWT). Matching the
 * header against SUPABASE_SERVICE_ROLE_KEY is not enough: that env var can
 * differ from the legacy service_role key the cron keeps in Vault once the
 * project's API keys are rotated. The gateway verifies the JWT signature
 * (verify_jwt is on for this function), so the role claim can be trusted.
 */
function isServiceRole(authHeader: string): boolean {
  if (authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  const token = authHeader.replace(/^Bearer\s+/i, "");
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role === "service_role";
  } catch {
    return false;
  }
}

// The browser (admin web) calls this cross-origin, so it needs a preflight
// answer and CORS headers on every response.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  const res = await handle(req);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let pushId: string | undefined;
  try {
    pushId = ((await req.json().catch(() => ({}))) as { pushId?: string }).pushId;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const isCron = isServiceRole(authHeader);
  const select = "id, residential_id, title, body, destination, bulletin_id, audience, unit_ids, location_ids";
  let rows: PushRow[];

  if (isCron) {
    const { data, error } = await service
      .from("push_notifications")
      .select(select)
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at")
      .limit(MAX_PER_CRON_RUN);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows = (data ?? []) as PushRow[];
  } else {
    if (!pushId) {
      return Response.json({ error: "pushId is required" }, { status: 400 });
    }
    const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: row, error } = await asCaller.from("push_notifications").select(select).eq("id", pushId).maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!row) return Response.json({ error: "Notification not found" }, { status: 404 });

    const { data: isAdmin } = await asCaller.rpc("is_residential_admin", { _residential_id: row.residential_id });
    const { data: isPlatformAdmin } = await asCaller.rpc("is_platform_admin");
    if (!isAdmin && !isPlatformAdmin) {
      return Response.json({ error: "Only residential admins can send notifications" }, { status: 403 });
    }
    rows = [row as PushRow];
  }

  if (!rows.length) return Response.json({ results: [] });

  // Checked before claiming anything so a missing config leaves rows
  // scheduled (they retry on the next run) instead of marking them failed.
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return Response.json(
      { error: "Push is not configured (set FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON)" },
      { status: 503 },
    );
  }

  try {
    const accessToken = await getFcmAccessToken(JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount);
    const results = [];
    for (const row of rows) results.push(await dispatch(service, row, accessToken));
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
