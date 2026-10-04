// guard-login
// Username + PIN sign-in for security guards. Sits in front of Supabase
// Auth's password grant only to add what Auth doesn't have: a per-username
// lockout after repeated wrong PINs (a PIN is guessable without one).
//
//   { username, pin } -> { access_token, refresh_token }
//
// The client then calls supabase.auth.setSession(...). The session itself is
// a normal Auth session — no inactivity timeout, ends only on sign-out or
// when an admin resets the PIN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, guardEmail, normalizeUsername, pinPassword } from "../_shared/guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_FAILURES = 5;
const LOCK_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const res = await handle(req);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  let body: { username?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const username = normalizeUsername(String(body.username ?? ""));
  const pin = String(body.pin ?? "");
  if (!username || !pin) return Response.json({ error: "Username and PIN are required" }, { status: 400 });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: attempts } = await admin
    .from("guard_login_attempts")
    .select("failed_count, locked_until")
    .eq("username", username)
    .maybeSingle();

  if (attempts?.locked_until && new Date(attempts.locked_until) > new Date()) {
    const minutes = Math.max(1, Math.ceil((new Date(attempts.locked_until).getTime() - Date.now()) / 60_000));
    return Response.json({ error: "locked", retryInMinutes: minutes }, { status: 429 });
  }

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  let { data, error } = await anon.auth.signInWithPassword({ email: guardEmail(username), password: pinPassword(pin) });
  // Guards created before the 4-digit change still have their raw 6-digit PIN as the password.
  if ((error || !data.session) && /^\d{6}$/.test(pin)) {
    ({ data, error } = await anon.auth.signInWithPassword({ email: guardEmail(username), password: pin }));
  }

  if (error || !data.session) {
    // Counted for unknown usernames too, so the response never reveals which exist.
    const failed = (attempts?.failed_count ?? 0) + 1;
    const lock = failed >= MAX_FAILURES;
    await admin.from("guard_login_attempts").upsert({
      username,
      failed_count: lock ? 0 : failed,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    });
    return Response.json({ error: "invalid", remaining: lock ? 0 : MAX_FAILURES - failed }, { status: 401 });
  }

  // A deactivated guard has the right PIN but no access: refuse the session.
  const { data: active } = await admin
    .from("residential_users")
    .select("residential_id")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!active) {
    await anon.auth.signOut();
    return Response.json({ error: "inactive" }, { status: 403 });
  }

  await admin.from("guard_login_attempts").delete().eq("username", username);
  return Response.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
