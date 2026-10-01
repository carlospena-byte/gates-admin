// notify-visitor-checkin
// Called right after a guard checks a visitor in (accessLogService.checkIn).
// Unlike send-push-notification (platform-admin only, caller-supplied
// userIds), this is scoped to one residential's own security/admin staff and
// derives its own recipients — the members of the visitor's unit — so a
// guard can never push to an arbitrary user by passing an arbitrary id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")!;

interface RequestBody {
  visitorId: string;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const contents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(contents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getFcmAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Failed to get FCM access token: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

function isUnregistered(fcmErrorBody: string): boolean {
  return fcmErrorBody.includes("UNREGISTERED") || fcmErrorBody.includes("NOT_FOUND");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let requestBody: RequestBody;
  try {
    requestBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!requestBody.visitorId) {
    return Response.json({ error: "visitorId is required" }, { status: 400 });
  }

  // Caller-scoped client: auth.uid() inside the RPCs below resolves from
  // this Authorization header, so the role check is the guard's own.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: visitor, error: visitorError } = await serviceClient
    .from("visitors")
    .select("id, name, unit_id, residential_id, status, visit_type, notify_on_arrival")
    .eq("id", requestBody.visitorId)
    .maybeSingle();
  if (visitorError) {
    return Response.json({ error: visitorError.message }, { status: 500 });
  }
  if (!visitor) {
    return Response.json({ error: "Visitor not found" }, { status: 404 });
  }
  if (!visitor.unit_id) {
    // No specific unit to notify — nothing to do, not an error.
    return Response.json({ sent: 0, failed: 0, invalidTokensRemoved: 0 });
  }

  if (visitor.visit_type === "frequent" && !visitor.notify_on_arrival) {
    // The resident opted out of "Avisarme al llegar" for this frequent visit.
    return Response.json({ sent: 0, failed: 0, invalidTokensRemoved: 0 });
  }

  const [{ data: isSecurity }, { data: isAdmin }] = await Promise.all([
    callerClient.rpc("is_residential_security", { _residential_id: visitor.residential_id }),
    callerClient.rpc("is_residential_admin", { _residential_id: visitor.residential_id }),
  ]);
  if (!isSecurity && !isAdmin) {
    return Response.json({ error: "Not authorized for this residential" }, { status: 403 });
  }

  const { data: members, error: membersError } = await serviceClient
    .from("unit_members")
    .select("user_id")
    .eq("unit_id", visitor.unit_id);
  if (membersError) {
    return Response.json({ error: membersError.message }, { status: 500 });
  }
  const userIds = (members ?? []).map((m) => m.user_id as string);
  if (!userIds.length) {
    return Response.json({ sent: 0, failed: 0, invalidTokensRemoved: 0 });
  }

  const { data: tokenRows, error: tokensError } = await serviceClient
    .from("device_tokens")
    .select("id, token")
    .in("user_id", userIds);
  if (tokensError) {
    return Response.json({ error: tokensError.message }, { status: 500 });
  }
  if (!tokenRows?.length) {
    return Response.json({ sent: 0, failed: 0, invalidTokensRemoved: 0 });
  }

  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const accessToken = await getFcmAccessToken(serviceAccount);

  const title = "Ingreso registrado";
  const body = `${visitor.name ?? "Tu visita"} ha ingresado`;

  let sent = 0;
  let failed = 0;
  const deadTokenIds: string[] = [];

  for (const row of tokenRows) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: row.token,
          notification: { title, body },
          data: { type: "visitor_checkin", visitorId: visitor.id },
        },
      }),
    });

    if (res.ok) {
      sent++;
    } else {
      failed++;
      const errorBody = await res.text();
      if (isUnregistered(errorBody)) deadTokenIds.push(row.id);
    }
  }

  let invalidTokensRemoved = 0;
  if (deadTokenIds.length) {
    const { count } = await serviceClient
      .from("device_tokens")
      .delete({ count: "exact" })
      .in("id", deadTokenIds);
    invalidTokensRemoved = count ?? 0;
  }

  return Response.json({ sent, failed, invalidTokensRemoved });
});
