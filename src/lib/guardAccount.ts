/**
 * Guard accounts sign in with username + PIN and have no real mailbox: their
 * auth email is a synthetic <username>@guardia.vecinoo.app (see the
 * manage-guard Edge Function). The UI uses this to show the username instead.
 */

export const GUARD_EMAIL_DOMAIN = "guardia.vecinoo.app";

export function isGuardEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${GUARD_EMAIL_DOMAIN}`);
}

export function guardUsernameFromEmail(email: string): string {
  return email.split("@")[0];
}
