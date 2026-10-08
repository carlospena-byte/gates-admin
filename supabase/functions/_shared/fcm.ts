// Shared FCM HTTP v1 helpers for edge functions that push to device_tokens.
// (send-push-notification still carries its own copy of the OAuth logic.)

export interface ServiceAccount {
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

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const contents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const der = Uint8Array.from(atob(contents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

/** Service-account OAuth2: a self-signed JWT exchanged for a short-lived access token. */
export async function getFcmAccessToken(serviceAccount: ServiceAccount): Promise<string> {
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
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Failed to get FCM access token: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** FCM's own signal that a token is dead and its device_tokens row should go. */
export function isUnregistered(fcmErrorBody: string): boolean {
  return fcmErrorBody.includes("UNREGISTERED") || fcmErrorBody.includes("NOT_FOUND");
}

export interface PushResult {
  sent: number;
  failed: number;
  deadTokenIds: string[];
}

/** Sends one notification to every token row, 25 requests at a time. */
export async function sendPush(params: {
  projectId: string;
  accessToken: string;
  tokens: { id: string; token: string }[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, deadTokenIds: [] };
  const url = `https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`;

  for (let i = 0; i < params.tokens.length; i += 25) {
    await Promise.all(
      params.tokens.slice(i, i + 25).map(async (row) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${params.accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title: params.title, body: params.body },
              data: params.data,
              // Matches the channel the app creates, so a backgrounded
              // Android push is shown at "high" importance.
              android: { notification: { channel_id: "default_channel" } },
            },
          }),
        });
        if (res.ok) {
          result.sent++;
        } else {
          result.failed++;
          const errorBody = await res.text();
          console.error(`FCM send failed (${res.status}) for device_tokens ${row.id}: ${errorBody}`);
          if (isUnregistered(errorBody)) result.deadTokenIds.push(row.id);
        }
      }),
    );
  }
  return result;
}
