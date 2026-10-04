/**
 * "Invited by" display for a visit: the inviter's name (staff don't know
 * residents' emails), falling back to the email when the profile has no name.
 */

import type { VisitorWithInviter } from "@/types/visitor.types";

export function inviterName(visitor: VisitorWithInviter): string | null {
  const profile = visitor.profiles;
  if (!profile) return null;
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return name || profile.email || null;
}
