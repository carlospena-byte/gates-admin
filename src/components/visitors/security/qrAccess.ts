/**
 * Pure helpers for the guard's QR reader. The visitor's QR encodes their
 * FastLane link (`<origin>/#fastlane/<access_code>`); the guard app only needs
 * the code, and decides from the visit's state whether that QR can still be used.
 */

import type { VisitorWithInviter } from "@/types/visitor.types";

/** Extracts the access code from a scanned QR payload (full link, bare hash or raw code). */
export function parseAccessCode(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const fromLink = /#fastlane\/([^/?#\s]+)/i.exec(text)?.[1];
  const code = fromLink ? decodeURIComponent(fromLink) : /^[A-Za-z0-9-]{4,64}$/.test(text) ? text : null;
  return code ? code.toUpperCase() : null;
}

export type QrVerdict = "ok" | "used" | "closed" | "notRegistered" | "notYetValid" | "expired";

/**
 * A QR is single-use: once the visit is `inside` (or has since completed) it
 * is rejected. Only a registered, in-window visit can be admitted.
 */
export function qrVerdict(visitor: VisitorWithInviter, now: Date = new Date()): QrVerdict {
  switch (visitor.status) {
    case "inside":
    case "completed":
      return "used";
    case "cancelled":
    case "rejected":
      return "closed";
    case "expired":
      return "expired";
    case "pending_registration":
      return "notRegistered";
    default:
      if (new Date(visitor.valid_until) < now) return "expired";
      if (new Date(visitor.valid_from) > now) return "notYetValid";
      return "ok";
  }
}
