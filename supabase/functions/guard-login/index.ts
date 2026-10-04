// guard-login
// Residential code + username + PIN sign-in for security guards. Sits in
// front of Supabase Auth's password grant only to add what Auth doesn't have:
// a lockout after repeated wrong PINs (a PIN is guessable without one), per
// guard and per client IP (so codes/usernames can't be probed in bulk).
//
//   { code, username, pin } -> { access_token, refresh_token }
//
// The client then calls supabase.auth.setSession(...). The session itself is
// a normal Auth session — no inactivity timeout, ends only on sign-out or
// when an admin resets the PIN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { attemptKey, CORS_HEADERS, normalizeCode, normalizeUsername, pinPassword } from "../_shared/guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Per guard: a PIN has only 10k combinations, so be strict.
const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;
// Per IP: loose enough for a shared guardhouse tablet, tight enough to stop sweeps.
const IP_MAX_FAILURES = 30;
const IP_LOCK_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const res = await handle(req);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: { code?: string; username?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const code = normalizeCode(String(body.code ?? ""));
  const username = normalizeUsername(String(body.username ?? ""));
  const pin = String(body.pin ?? "");
  if (!code || !username || !pin) {
    return Response.json({ error: "Code, username and PIN are required" }, { status: 400 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const guardKey = attemptKey(code, username);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ipKey = `ip:${ip}`;

  const { data: rows } = await admin
    .from("guard_login_attempts")
    .select("key, failed_count, locked_until")
    .in("key", [guardKey, ipKey]);
  const attempts = rows?.find((r) => r.key === guardKey);
  const ipAttempts = rows?.find((r) => r.key === ipKey);

  const lockedUntil = [attempts?.locked_until, ipAttempts?.locked_until]
    .filter((v): v is string => Boolean(v) && new Date(v as string) > new Date())
    .map((v) => new Date(v).getTime())
    .sort((a, b) => b - a)[0];
  if (lockedUntil) {
    const minutes = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60_000));
    return Response.json({ error: "locked", retryInMinutes: minutes }, { status: 429 });
  }

  const fail = async () => {
    // Counted for unknown codes/usernames too, so the response never reveals which exist.
    const failed = (attempts?.failed_count ?? 0) + 1;
    const lock = failed >= MAX_FAILURES;
    const ipFailed = (ipAttempts?.failed_count ?? 0) + 1;
    const ipLock = ipFailed >= IP_MAX_FAILURES;
    await admin.from("guard_login_attempts").upsert([
      {
        key: guardKey,
        failed_count: lock ? 0 : failed,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      },
      {
        key: ipKey,
        failed_count: ipLock ? 0 : ipFailed,
        locked_until: ipLock ? new Date(Date.now() + IP_LOCK_MINUTES * 60_000).toISOString() : null,
      },
    ]);
    return Response.json({ error: "invalid", remaining: lock ? 0 : MAX_FAILURES - failed }, { status: 401 });
  };

  // code -> residential -> that residential's guard with this username.
  const { data: residential } = await admin
    .from("residentials")
    .select("id, is_active")
    .eq("code", code)
    .maybeSingle();
  if (!residential || !residential.is_active) return fail();

  const { data: guard } = await admin
    .from("profiles")
    .select("user_id, email")
    .eq("guard_residential_id", residential.id)
    .ilike("username", username)
    .maybeSingle();
  if (!guard?.email) return fail();

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  let { data, error } = await anon.auth.signInWithPassword({ email: guard.email, password: pinPassword(pin) });
  // Guards created before the 4-digit change still have their raw 6-digit PIN as the password.
  if ((error || !data.session) && /^\d{6}$/.test(pin)) {
    ({ data, error } = await anon.auth.signInWithPassword({ email: guard.email, password: pin }));
  }
  if (error || !data.session) return fail();

  // A deactivated guard has the right PIN but no access: refuse the session.
  const { data: active } = await admin
    .from("residential_users")
    .select("residential_id")
    .eq("user_id", data.user.id)
    .eq("residential_id", residential.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!active) {
    await anon.auth.signOut();
    return Response.json({ error: "inactive" }, { status: 403 });
  }

  await admin.from("guard_login_attempts").delete().eq("key", guardKey);
  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
