// send-invitation
// Creates a unit_invitations row (via the create_unit_invitation RPC, run
// with the caller's own JWT so the admin-permission check is real) and
// emails the code. The RPC always runs first, so a resident is never left
// without an invitation just because the email failed — the response
// reports emailSent separately and always includes the code so
// gates-admin can show it for the admin to copy/share manually as a
// fallback (see the manual-code decision: no deep links in this version).
//
// Sending picks whichever transport is configured: SMTP_HOST (set for
// local dev, pointing at the same Mailpit container Supabase Auth already
// uses — see supabase/config.toml's [auth.email.smtp]) takes priority so
// local testing never needs a real Resend account; otherwise it falls
// back to Resend via RESEND_API_KEY/RESEND_FROM_EMAIL for staging/prod.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST");
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "1025");
const SMTP_FROM_EMAIL = Deno.env.get("SMTP_FROM_EMAIL") ?? "invitations@gates.local";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");
const RESEND_FROM_NAME = Deno.env.get("RESEND_FROM_NAME") ?? "Gates";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function invitationHtml(code: string): string {
  return `
    <p>Te invitaron a unirte a tu residencial en la app.</p>
    <p>Descarga la app y, al registrarte, ingresa este código de invitación:</p>
    <h1 style="letter-spacing: 4px;">${code}</h1>
    <p>Este código vence en 24 horas.</p>
  `;
}

/** Local dev only: delivers straight to Mailpit's SMTP, no auth needed. */
async function sendViaSmtp(to: string, code: string): Promise<void> {
  const client = new SMTPClient({
    connection: { hostname: SMTP_HOST!, port: SMTP_PORT, tls: false },
    // Mailpit takes unauthenticated, unencrypted mail — denomailer refuses
    // that combination unless explicitly told it's fine.
    debug: { allowUnsecure: true },
  });
  try {
    await client.send({
      from: `Gates <${SMTP_FROM_EMAIL}>`,
      to,
      subject: "Tu código de invitación",
      html: invitationHtml(code),
    });
  } finally {
    // A failed send can leave denomailer's internal connection unset;
    // don't let a close() error mask the real failure from send() above.
    try {
      await client.close();
    } catch {
      // ignore
    }
  }
}

async function sendViaResend(to: string, code: string): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: "Tu código de invitación",
      html: invitationHtml(code),
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

interface RequestBody {
  unitId: string;
  email: string;
  phone?: string;
  unitResidentId?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return Response.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.unitId || !body.email) {
    return Response.json({ error: "unitId and email are required" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: invitation, error: rpcError } = await supabase
    .rpc("create_unit_invitation", {
      _unit_id: body.unitId,
      _email: body.email,
      _phone: body.phone ?? null,
      _unit_resident_id: body.unitResidentId ?? null,
    })
    .single();

  if (rpcError || !invitation) {
    return Response.json({ error: rpcError?.message ?? "Failed to create invitation" }, { status: 400 });
  }

  const code = (invitation as { code: string }).code;

  let emailSent = false;
  let emailError: string | undefined;

  try {
    if (SMTP_HOST) {
      await sendViaSmtp(body.email, code);
      emailSent = true;
    } else if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
      await sendViaResend(body.email, code);
      emailSent = true;
    } else {
      emailError = "No email transport configured (set SMTP_HOST for local dev, or RESEND_API_KEY / RESEND_FROM_EMAIL)";
    }
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
  }

  return Response.json({
    invitationId: (invitation as { id: string }).id,
    code,
    expiresAt: (invitation as { expires_at: string }).expires_at,
    emailSent,
    emailError,
  });
});
