// send-push-notification
// Delivers a push to one or more users via FCM's HTTP v1 API, looking up
// their registered device_tokens. Restricted to platform admins for now —
// there's no per-feature authorization yet (e.g. "only this residential's
// admin, for its own residents"), so this is meant to be called from
// trusted server-side flows, not exposed as a general-purpose button.
// Extend the auth check here once a real caller (announcements, incidents)
// needs to send to a residential's own members instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")!;

interface RequestBody {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/** Base64url-encodes without padding, as required by JWT. */
function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PEM -> CryptoKey, for signing the OAuth2 JWT assertion below. */
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

/**
 * Google's service-account OAuth2 flow: a self-signed JWT asserting the
 * `firebase.messaging` scope, exchanged for a short-lived access token.
 * No refresh/caching — each invocation is one-off and infrequent enough
 * that a fresh token per call is simpler than a correct cross-invocation
 * cache in a stateless edge function.
 */
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

/** FCM's own signal that a token is dead and its device_tokens row should go. */
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

  if (!requestBody.userIds?.length || !requestBody.title || !requestBody.body) {
    return Response.json({ error: "userIds, title and body are required" }, { status: 400 });
  }

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: adminRow } = await serviceClient
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!adminRow) {
    return Response.json({ error: "Only platform admins can send pushes" }, { status: 403 });
  }

  const { data: tokenRows, error: tokensError } = await serviceClient
    .from("device_tokens")
    .select("id, token")
    .in("user_id", requestBody.userIds);
  if (tokensError) {
    return Response.json({ error: tokensError.message }, { status: 500 });
  }
  if (!tokenRows?.length) {
    return Response.json({ sent: 0, failed: 0, invalidTokensRemoved: 0 });
  }

  const serviceAccount = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const accessToken = await getFcmAccessToken(serviceAccount);

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
          notification: { title: requestBody.title, body: requestBody.body },
          data: requestBody.data,
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
