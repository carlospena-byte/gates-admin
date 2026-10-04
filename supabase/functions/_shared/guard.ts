// Shared bits for the username + PIN guard accounts (manage-guard, guard-login).

export const GUARD_EMAIL_DOMAIN = "guardia.vecinoo.app";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Supabase Auth refuses passwords shorter than 6 characters, so a 4-digit PIN
 * is never stored as-is: the Auth password is PIN + a server-side secret. The
 * secret also means the PIN alone is useless against Auth's own password
 * endpoint, which would otherwise skip guard-login's lockout.
 */
export function pinPassword(pin: string): string {
  const pepper = Deno.env.get("GUARD_PIN_PEPPER");
  if (!pepper) throw new Error("GUARD_PIN_PEPPER is not set");
  return `${pin}${pepper}`;
}

export function guardEmail(username: string): string {
  return `${username}@${GUARD_EMAIL_DOMAIN}`;
}

/** Lowercase, accent-free, [a-z0-9] only — safe as the local part of an email. */
export function normalizeUsername(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Random 4-digit PIN from the CSPRNG (uniform: rejects the biased tail). */
export function generatePin(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 10_000) * 10_000;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(buf[0] % 10_000).padStart(4, "0");
}
