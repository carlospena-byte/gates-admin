// fastlane-submit
// Public, unauthenticated endpoint (verify_jwt = false, see config.toml): the
// visitor opens the FastLane link on their own phone with no Supabase
// session at all, so this is the only writer allowed to touch a
// pending_registration visitor row. The access_code is the sole credential —
// same bearer-code trust model as unit_invitations.code — so everything here
// runs with the service role key after validating the code itself, mirroring
// how create_unit_invitation/accept_unit_invitation split privileged work
// from the caller's own permissions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// The visitor page lives on another origin (admin.vecinoo.app) and posts
// multipart data, so the browser sends a preflight before every submit.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
}

// GET ?code=XXXX — what the visitor's page needs to render: who invited them
// (resident name + unit location), the name the resident typed, and whether
// the visit is already registered (then the page shows its QR directly).
async function handleInfo(req: Request): Promise<Response> {
  const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!code) return json({ error: "code is required" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: visitor, error } = await supabase
    .from("visitors")
    .select("name, plate, status, valid_from, valid_until, invited_by, unit_id, residential_id, residentials(name)")
    .eq("access_code", code)
    .eq("visit_type", "fastlane")
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!visitor) return json({ error: "This link is invalid" }, 404);
  if (visitor.status !== "pending_registration" && visitor.status !== "scheduled") {
    return json({ error: "This link is no longer active" }, 410);
  }

  const [{ data: profile }, { data: unit }] = await Promise.all([
    visitor.invited_by
      ? supabase.from("profiles").select("first_name, last_name").eq("user_id", visitor.invited_by).maybeSingle()
      : Promise.resolve({ data: null }),
    visitor.unit_id
      ? supabase.from("units").select("name, location_id").eq("id", visitor.unit_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  // Walk location -> parent -> ... so the visitor sees "Torre 1 → Piso 1 → 101".
  const path: string[] = [];
  let locationId: string | null = unit?.location_id ?? null;
  for (let depth = 0; locationId && depth < 8; depth++) {
    const { data: loc } = await supabase
      .from("locations")
      .select("name, parent_id")
      .eq("id", locationId)
      .maybeSingle();
    if (!loc) break;
    path.unshift(loc.name);
    locationId = loc.parent_id;
  }
  if (unit?.name) path.push(unit.name);

  // deno-lint-ignore no-explicit-any
  const residential = (visitor as any).residentials;
  return json({
    registered: visitor.status === "scheduled",
    expired: new Date(visitor.valid_until) < new Date(),
    visitor_name: visitor.name,
    plate: visitor.plate,
    valid_from: visitor.valid_from,
    valid_until: visitor.valid_until,
    resident_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null,
    location_path: path.join(" → ") || null,
    residential_name: residential?.name ?? null,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method === "GET") {
    return await handleInfo(req);
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Invalid form data" }, 400);
  }

  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const name = String(form.get("name") ?? "").trim();
  const plate = String(form.get("plate") ?? "").trim();
  const photo = form.get("photo");

  if (!code) {
    return json({ error: "code is required" }, 400);
  }
  if (!(photo instanceof File)) {
    return json({ error: "A photo of your ID is required" }, 400);
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return json({ error: "Photo is too large" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: visitor, error: lookupError } = await supabase
    .from("visitors")
    .select("id, residential_id, valid_until, name")
    .eq("access_code", code)
    .eq("visit_type", "fastlane")
    .eq("status", "pending_registration")
    .maybeSingle();

  if (lookupError) {
    return json({ error: lookupError.message }, 500);
  }
  if (!visitor) {
    return json({ error: "This link is invalid or has already been used" }, 404);
  }
  if (new Date(visitor.valid_until) < new Date()) {
    return json({ error: "This link has expired" }, 410);
  }

  // The resident already named the guest when creating the invitation; the
  // visitor only has to supply a name if that was left blank (admin flow).
  const finalName = visitor.name?.trim() || name;
  if (!finalName) {
    return json({ error: "name is required" }, 400);
  }

  const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `${visitor.residential_id}/${visitor.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("visitor-id-photos")
    .upload(storagePath, photo, { contentType: photo.type || "image/jpeg" });

  if (uploadError) {
    return json({ error: uploadError.message }, 500);
  }

  const { error: updateError } = await supabase
    .from("visitors")
    .update({
      name: finalName,
      plate: plate || null,
      id_photo_path: storagePath,
      status: "scheduled",
      registered_at: new Date().toISOString(),
    })
    .eq("id", visitor.id);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ success: true });
});
