// send-visit-notification
// Sends the FastLane self-registration link to the visitor's phone via
// Twilio (SMS or WhatsApp). The visitor row is looked up with the caller's
// own forwarded JWT so RLS (admin/security/"members manage own unit") is the
// real authorization check — the client only supplies visitId + channel, not
// the phone/code, so a caller can't use this to blast an arbitrary message
// to an arbitrary number. Storage (QR upload) and the Twilio call itself use
// the service role key, same "authz with the caller's JWT, privileged work
// with the service role" split as fastlane-submit/create_unit_invitation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "http://localhost:5173/";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_SMS_FROM = Deno.env.get("TWILIO_SMS_FROM");
const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

interface RequestBody {
  visitId: string;
  channel: "sms" | "whatsapp";
}

function fastlaneLink(code: string): string {
  const base = PUBLIC_APP_URL.endsWith("/") ? PUBLIC_APP_URL : `${PUBLIC_APP_URL}/`;
  return `${base}#fastlane/${code}`;
}

async function uploadQrCode(
  serviceClient: ReturnType<typeof createClient>,
  code: string,
  link: string,
): Promise<string | null> {
  const png = await QRCode.toBuffer(link, { type: "png", width: 480 });
  const path = `${code}.png`;
  const { error } = await serviceClient.storage
    .from("visit-qrcodes")
    .upload(path, png, { contentType: "image/png", upsert: true });
  if (error) return null;
  const { data } = serviceClient.storage.from("visit-qrcodes").getPublicUrl(path);
  return data.publicUrl;
}

async function sendTwilioMessage(params: {
  to: string;
  from: string;
  body: string;
  mediaUrl?: string;
}): Promise<void> {
  const form = new URLSearchParams({ To: params.to, From: params.from, Body: params.body });
  if (params.mediaUrl) form.set("MediaUrl", params.mediaUrl);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    },
  );
  if (!res.ok) throw new Error(await res.text());
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

  if (!body.visitId || (body.channel !== "sms" && body.channel !== "whatsapp")) {
    return Response.json({ error: "visitId and a valid channel are required" }, { status: 400 });
  }

  const supabaseAsCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: visitor, error: fetchError } = await supabaseAsCaller
    .from("visitors")
    .select("id, phone, access_code")
    .eq("id", body.visitId)
    .eq("visit_type", "fastlane")
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!visitor || !visitor.phone || !visitor.access_code) {
    return Response.json({ error: "Visit not found or has no contact phone" }, { status: 404 });
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return Response.json({
      notificationSent: false,
      error: "Twilio is not configured (set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)",
    });
  }
  const fromNumber = body.channel === "whatsapp" ? TWILIO_WHATSAPP_FROM : TWILIO_SMS_FROM;
  if (!fromNumber) {
    return Response.json({
      notificationSent: false,
      error: `No Twilio sender configured for channel "${body.channel}"`,
    });
  }

  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const link = fastlaneLink(visitor.access_code);

  try {
    if (body.channel === "whatsapp") {
      const qrUrl = await uploadQrCode(supabaseService, visitor.access_code, link);
      await sendTwilioMessage({
        to: `whatsapp:${visitor.phone}`,
        from: `whatsapp:${fromNumber}`,
        body: `Te compartieron un acceso FastLane. Completa tus datos aquí: ${link}`,
        mediaUrl: qrUrl ?? undefined,
      });
    } else {
      // Plain SMS can't carry an image attachment — the visitor gets the
      // link only and taps it, no QR image (that's a real SMS limitation,
      // not something we're skipping).
      await sendTwilioMessage({
        to: visitor.phone,
        from: fromNumber,
        body: `Te compartieron un acceso FastLane. Completa tus datos aquí: ${link}`,
      });
    }
  } catch (err) {
    return Response.json({
      notificationSent: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return Response.json({ notificationSent: true, link });
});
