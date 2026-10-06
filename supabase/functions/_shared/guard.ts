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

/**
 * Synthetic auth email for a new guard. The residential id keeps it unique
 * across residentials that reuse the same username. (Guards created before
 * usernames became per-residential keep <username>@..., stored on their
 * profile, which is what guard-login signs in with.)
 */
export function guardEmail(username: string, residentialId: string): string {
  return `${username}.${residentialId.replace(/-/g, "")}@${GUARD_EMAIL_DOMAIN}`;
}

/** Residential codes are lowercase [a-z0-9] (see residentials_code_format). */
export function normalizeCode(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** guard_login_attempts key for one guard of one residential. */
export function attemptKey(code: string, username: string): string {
  return `${code}:${username}`;
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
