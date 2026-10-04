// send-mass-push
// Platform-admin broadcast: pushes a title/body to every user's devices, or to
// the members of one or several residentials. Authorization is the caller's
// own JWT and only a platform admin passes. Every send is recorded in
// push_campaigns (history shown in the admin).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendPush, type ServiceAccount } from "../_shared/fcm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

const MAX_TITLE = 100;
const MAX_BODY = 500;
const PAGE = 1000;

interface Body {
  title?: string;
  body?: string;
  audience?: "all" | "residentials";
  residentialIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let input: Body;
  try {
    input = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = input.title?.trim();
  const body = input.body?.trim();
  const audience = input.audience;
  const residentialIds = [...new Set(input.residentialIds ?? [])];

  if (!title || !body) {
    return Response.json({ error: "title and body are required" }, { status: 400 });
  }
  if (title.length > MAX_TITLE || body.length > MAX_BODY) {
    return Response.json({ error: "title or body too long" }, { status: 400 });
  }
  if (audience !== "all" && audience !== "residentials") {
    return Response.json({ error: "audience must be 'all' or 'residentials'" }, { status: 400 });
  }
  if (audience === "residentials" && !residentialIds.length) {
    return Response.json({ error: "Select at least one residential" }, { status: 400 });
  }

  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: isPlatformAdmin } = await asCaller.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    return Response.json({ error: "Only platform admins can send mass notifications" }, { status: 403 });
  }
  const { data: userData } = await asCaller.auth.getUser();

  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return Response.json(
      { error: "Push is not configured (set FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON)" },
      { status: 503 },
    );
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    let tokenRows: { id: string; token: string }[] = [];
    let recipients = 0;

    if (audience === "all") {
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await service
          .from("device_tokens")
          .select("id, token, user_id")
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        tokenRows.push(...(data ?? []).map((r) => ({ id: r.id as string, token: r.token as string })));
        if ((data?.length ?? 0) < PAGE) break;
      }
      const { count } = await service.from("device_tokens").select("user_id", { count: "exact", head: true });
      recipients = count ?? tokenRows.length;
    } else {
      const { data: members, error: membersError } = await service
        .from("unit_members")
        .select("user_id")
        .in("residential_id", residentialIds);
      if (membersError) throw new Error(membersError.message);
      const userIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
      recipients = userIds.length;
      for (let i = 0; i < userIds.length; i += PAGE) {
        const { data, error } = await service
          .from("device_tokens")
          .select("id, token")
          .in("user_id", userIds.slice(i, i + PAGE));
        if (error) throw new Error(error.message);
        tokenRows.push(...(data ?? []).map((r) => ({ id: r.id as string, token: r.token as string })));
      }
    }

    let sent = 0;
    let failed = 0;
    let invalidTokensRemoved = 0;

    if (tokenRows.length) {
      const accessToken = await getFcmAccessToken(JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount);
      const result = await sendPush({
        projectId: FCM_PROJECT_ID,
        accessToken,
        tokens: tokenRows,
        title,
        body,
        data: { type: "broadcast" },
      });
      sent = result.sent;
      failed = result.failed;
      if (result.deadTokenIds.length) {
        await service.from("device_tokens").delete().in("id", result.deadTokenIds);
        invalidTokensRemoved = result.deadTokenIds.length;
      }
    }

    await service.from("push_campaigns").insert({
      title,
      body,
      audience,
      residential_ids: audience === "residentials" ? residentialIds : [],
      recipients,
      sent,
      failed,
      created_by: userData.user?.id ?? null,
    });

    return Response.json({ sent, failed, recipients, invalidTokensRemoved });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
