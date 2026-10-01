// review-login
// Fixed-code sign-in for the single App Store / Play Store reviewer account.
// Supabase has no fixed OTP for email, so the app calls this instead of
// waiting for a mailed code: when `email` equals REVIEW_EMAIL and `code`
// equals REVIEW_CODE (both function secrets, never in the repo), it mints a
// real one-time email OTP for that existing user via the admin API and
// returns it; the app then runs the normal verifyOTP with it.
//
// Blast radius is one account: it never creates users (the account must
// already exist and be linked to the review residential), and it does
// nothing at all if either secret is unset. Remove the secrets to disable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REVIEW_EMAIL = (Deno.env.get("REVIEW_EMAIL") ?? "").trim().toLowerCase();
const REVIEW_CODE = Deno.env.get("REVIEW_CODE") ?? "";

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!REVIEW_EMAIL || !REVIEW_CODE) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const code = String(body.code ?? "");

  if (!safeEqual(email, REVIEW_EMAIL) || !safeEqual(code, REVIEW_CODE)) {
    return Response.json({ error: "Invalid code" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // generateLink would create the user if missing; refuse instead.
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("email", REVIEW_EMAIL)
    .maybeSingle();
  if (!profile) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: REVIEW_EMAIL,
  });
  const otp = data?.properties?.email_otp;
  if (error || !otp) {
    return Response.json({ error: "Could not issue code" }, { status: 500 });
  }
  return Response.json({ token: otp });
});
