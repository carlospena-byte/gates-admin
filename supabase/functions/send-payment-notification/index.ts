// send-payment-notification
// Pushes "your payment was verified" to the members of the unit a payment
// was recorded for, with a data payload the mobile app uses to open the
// billing screen on tap. Authorization is the caller's own JWT: only an
// owner/admin of the payment's residential (or a platform admin) may notify,
// and recipients are derived server-side from the payment's unit, so the
// caller can never push to an arbitrary user.
// Payments recorded together (bulk pay) are grouped per unit into a single
// push instead of one per installment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFcmAccessToken, sendPush, type ServiceAccount } from "../_shared/fcm.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID");
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");

const MAX_PAYMENTS = 200;

interface PaymentRow {
  id: string;
  residential_id: string;
  amount: number | string;
  installment: { unit_id: string; charge: { name: string } | null } | null;
}

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let paymentIds: string[] | undefined;
  try {
    paymentIds = ((await req.json()) as { paymentIds?: string[] }).paymentIds;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(paymentIds) || !paymentIds.length || paymentIds.length > MAX_PAYMENTS) {
    return Response.json({ error: `paymentIds must hold 1-${MAX_PAYMENTS} ids` }, { status: 400 });
  }

  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // RLS only returns payments the caller can see; the explicit admin check
  // below is what stops a plain resident from triggering a push.
  const { data, error: paymentsError } = await asCaller
    .from("charge_payments")
    .select("id, residential_id, amount, installment:charge_installments(unit_id, charge:charges(name))")
    .in("id", paymentIds);
  if (paymentsError) {
    return Response.json({ error: paymentsError.message }, { status: 500 });
  }
  const payments = (data ?? []) as unknown as PaymentRow[];
  if (!payments.length) {
    return Response.json({ error: "Payments not found" }, { status: 404 });
  }

  const residentialIds = [...new Set(payments.map((p) => p.residential_id))];
  const { data: isPlatformAdmin } = await asCaller.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    for (const residentialId of residentialIds) {
      const { data: isAdmin } = await asCaller.rpc("is_residential_admin", { _residential_id: residentialId });
      if (!isAdmin) {
        return Response.json({ error: "Only residential admins can notify" }, { status: 403 });
      }
    }
  }

  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    return Response.json(
      { error: "Push is not configured (set FCM_PROJECT_ID / FCM_SERVICE_ACCOUNT_JSON)" },
      { status: 503 },
    );
  }

  // One push per unit: total paid and, when it is a single charge, its name.
  const byUnit = new Map<string, { residentialId: string; total: number; charges: Set<string> }>();
  for (const payment of payments) {
    const unitId = payment.installment?.unit_id;
    if (!unitId) continue;
    const entry = byUnit.get(unitId) ?? { residentialId: payment.residential_id, total: 0, charges: new Set() };
    entry.total += Number(payment.amount);
    if (payment.installment?.charge?.name) entry.charges.add(payment.installment.charge.name);
    byUnit.set(unitId, entry);
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  try {
    const { data: members, error: membersError } = await service
      .from("unit_members")
      .select("unit_id, user_id")
      .in("unit_id", [...byUnit.keys()]);
    if (membersError) throw new Error(membersError.message);

    const userIdsByUnit = new Map<string, string[]>();
    for (const m of members ?? []) {
      const list = userIdsByUnit.get(m.unit_id as string) ?? [];
      list.push(m.user_id as string);
      userIdsByUnit.set(m.unit_id as string, list);
    }

    const allUserIds = [...new Set((members ?? []).map((m) => m.user_id as string))];
    if (!allUserIds.length) {
      return Response.json({ sent: 0, failed: 0, recipients: 0 });
    }

    const { data: tokenRows, error: tokensError } = await service
      .from("device_tokens")
      .select("id, token, user_id")
      .in("user_id", allUserIds);
    if (tokensError) throw new Error(tokensError.message);
    if (!tokenRows?.length) {
      return Response.json({ sent: 0, failed: 0, recipients: allUserIds.length });
    }

    const accessToken = await getFcmAccessToken(JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as ServiceAccount);
    let sent = 0;
    let failed = 0;
    const deadTokenIds: string[] = [];

    for (const [unitId, entry] of byUnit) {
      const userIds = new Set(userIdsByUnit.get(unitId) ?? []);
      const tokens = tokenRows.filter((t) => userIds.has(t.user_id as string));
      if (!tokens.length) continue;

      const charge = entry.charges.size === 1 ? [...entry.charges][0] : null;
      const result = await sendPush({
        projectId: FCM_PROJECT_ID,
        accessToken,
        tokens: tokens.map((t) => ({ id: t.id as string, token: t.token as string })),
        title: "Pago verificado",
        body: charge
          ? `Tu pago de ${formatAmount(entry.total)} (${charge}) se verificó con éxito.`
          : `Tu pago de ${formatAmount(entry.total)} se verificó con éxito.`,
        data: { type: "payment", unit_id: unitId, residential_id: entry.residentialId },
      });
      sent += result.sent;
      failed += result.failed;
      deadTokenIds.push(...result.deadTokenIds);
    }

    if (deadTokenIds.length) {
      await service.from("device_tokens").delete().in("id", deadTokenIds);
    }

    return Response.json({
      sent,
      failed,
      invalidTokensRemoved: deadTokenIds.length,
      recipients: allUserIds.length,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
