// process-account-deletions
// Permanently removes every account whose deletion request (see
// profiles.deletion_scheduled_for, set by request_account_deletion()) has
// reached its date: avatar files first, then the auth user — profiles and
// everything that cascades from it go with it. Invoked daily by pg_cron
// (see 20261109000000_profile_self_service.sql); only callable with the
// service-role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.headers.get("Authorization") !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: due, error } = await admin
    .from("profiles")
    .select("user_id")
    .not("deletion_scheduled_for", "is", null)
    .lte("deletion_scheduled_for", new Date().toISOString());
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const deleted: string[] = [];
  const failed: { userId: string; error: string }[] = [];

  for (const { user_id: userId } of due ?? []) {
    try {
      const { data: files } = await admin.storage.from("avatars").list(userId);
      if (files && files.length > 0) {
        await admin.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;
      deleted.push(userId);
    } catch (e) {
      failed.push({ userId, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return Response.json({ deleted: deleted.length, failed });
});
