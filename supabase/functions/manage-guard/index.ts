// manage-guard
// Admin-only: creates a security guard account (username + 4-digit PIN, no
// real email) or resets a guard's PIN. Supabase Auth admin calls need the
// service role, so this is the one place that holds it; the caller's own
// JWT is still used to prove they administer the residential.
//
//   { action: "create", residentialId, firstName, lastName, username?, pin? }
//     (pin: 4 digits chosen by the admin, required)
//     -> { userId, username, pin }
//   { action: "reset_pin", residentialId, userId, pin? }   (pin: 4 digits; random when omitted)
//     -> { pin }   (also ends that guard's open sessions)
//
// The PIN is generated here and returned exactly once; it is never stored in
// plain text anywhere (Auth keeps only its hash).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, generatePin, guardEmail, normalizeUsername, pinPassword } from "../_shared/guard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Body =
  | { action: "create"; residentialId: string; firstName: string; lastName: string; username?: string; pin: string }
  | { action: "reset_pin"; residentialId: string; userId: string; pin?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const res = await handle(req);
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
});

async function handle(req: Request): Promise<Response> {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Missing Authorization header" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.residentialId) return Response.json({ error: "residentialId is required" }, { status: 400 });

  // The caller must administer this residential (checked with their own JWT).
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isAdmin, error: adminError } = await userClient.rpc("is_residential_admin", {
    _residential_id: body.residentialId,
  });
  if (adminError || isAdmin !== true) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (body.action === "create") return createGuard(admin, body);
  if (body.action === "reset_pin") return resetPin(admin, body);
  return Response.json({ error: "Unknown action" }, { status: 400 });
}

type AdminClient = ReturnType<typeof createClient>;

async function pickUsername(admin: AdminClient, base: string, exact: boolean): Promise<string | null> {
  for (let n = 1; n <= 99; n++) {
    const candidate = n === 1 ? base : `${base}${n}`;
    const { data } = await admin.from("profiles").select("user_id").ilike("username", candidate).maybeSingle();
    if (!data) return candidate;
    if (exact) return null; // an admin-chosen username must be used as typed
  }
  return null;
}

async function createGuard(admin: AdminClient, body: Extract<Body, { action: "create" }>): Promise<Response> {
  const firstName = body.firstName?.trim();
  const lastName = body.lastName?.trim();
  if (!firstName || !lastName) {
    return Response.json({ error: "First and last name are required" }, { status: 400 });
  }

  const typed = body.username ? normalizeUsername(body.username) : "";
  if (body.username && (typed.length < 3 || typed.length > 20)) {
    return Response.json({ error: "Username must be 3–20 letters or numbers" }, { status: 400 });
  }
  const base = typed || normalizeUsername(`${firstName[0]}${lastName}`).slice(0, 20);
  if (base.length < 3) {
    return Response.json({ error: "Could not build a username from that name" }, { status: 400 });
  }
  const username = await pickUsername(admin, base, Boolean(typed));
  if (!username) return Response.json({ error: "That username is already taken" }, { status: 409 });

  if (!/^\d{4}$/.test(body.pin ?? "")) {
    return Response.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  const pin = body.pin;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: guardEmail(username),
    password: pinPassword(pin),
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (createError || !created.user) {
    return Response.json({ error: createError?.message ?? "Could not create the account" }, { status: 500 });
  }
  const userId = created.user.id;

  // handle_auth_user_created already inserted the profile row (email only).
  const rollback = async (message: string) => {
    await admin.auth.admin.deleteUser(userId);
    return Response.json({ error: message }, { status: 500 });
  };

  const { error: profileError } = await admin
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, username })
    .eq("user_id", userId);
  if (profileError) return rollback(profileError.message);

  const { error: roleError } = await admin
    .from("residential_users")
    .insert({ residential_id: body.residentialId, user_id: userId, role: "security" });
  if (roleError) return rollback(roleError.message);

  return Response.json({ userId, username, pin });
}

async function resetPin(admin: AdminClient, body: Extract<Body, { action: "reset_pin" }>): Promise<Response> {
  if (!body.userId) return Response.json({ error: "userId is required" }, { status: 400 });

  // Only guard accounts of this residential: security role + a username.
  const { data: membership } = await admin
    .from("residential_users")
    .select("role")
    .eq("residential_id", body.residentialId)
    .eq("user_id", body.userId)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("username")
    .eq("user_id", body.userId)
    .maybeSingle();
  if (membership?.role !== "security" || !profile?.username) {
    return Response.json({ error: "Not a guard account of this residential" }, { status: 404 });
  }

  if (body.pin !== undefined && !/^\d{4}$/.test(body.pin)) {
    return Response.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }
  const pin = body.pin ?? generatePin();
  const { error: updateError } = await admin.auth.admin.updateUserById(body.userId, { password: pinPassword(pin) });
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // New PIN also ends whatever sessions were open (lost phone, ex-guard…),
  // and clears any lockout so the new PIN works right away.
  await admin.rpc("revoke_user_sessions", { _user_id: body.userId });
  await admin.from("guard_login_attempts").delete().eq("username", profile.username.toLowerCase());

  return Response.json({ pin });
}
