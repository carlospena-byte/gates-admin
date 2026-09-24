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

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid form data" }, { status: 400 });
  }

  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const name = String(form.get("name") ?? "").trim();
  const plate = String(form.get("plate") ?? "").trim();
  const photo = form.get("photo");

  if (!code || !name) {
    return Response.json({ error: "code and name are required" }, { status: 400 });
  }
  if (!(photo instanceof File)) {
    return Response.json({ error: "A photo of your ID is required" }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return Response.json({ error: "Photo is too large" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: visitor, error: lookupError } = await supabase
    .from("visitors")
    .select("id, residential_id, valid_until")
    .eq("access_code", code)
    .eq("visit_type", "fastlane")
    .eq("status", "pending_registration")
    .maybeSingle();

  if (lookupError) {
    return Response.json({ error: lookupError.message }, { status: 500 });
  }
  if (!visitor) {
    return Response.json({ error: "This link is invalid or has already been used" }, { status: 404 });
  }
  if (new Date(visitor.valid_until) < new Date()) {
    return Response.json({ error: "This link has expired" }, { status: 410 });
  }

  const ext = (photo.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `${visitor.residential_id}/${visitor.id}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("visitor-id-photos")
    .upload(storagePath, photo, { contentType: photo.type || "image/jpeg" });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("visitors")
    .update({
      name,
      plate: plate || null,
      id_photo_path: storagePath,
      status: "scheduled",
      registered_at: new Date().toISOString(),
    })
    .eq("id", visitor.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ success: true });
});
