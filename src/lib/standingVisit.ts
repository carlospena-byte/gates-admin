/**
 * "Standing" frequent visits — resident-authorised access with a recurrence
 * (e.g. the maid who comes Mon–Fri). They're a long-lived authorization, not
 * a one-off event, so they live in their own tab instead of the operational
 * Today/Upcoming/Inside/History tables. Admin-registered frequent visits have
 * no recurrence and stay day-bound, so they remain regular rows.
 */

import type { AccessLogEntry } from "@/services/accessLogService";
import type { RecurrenceDay, VisitorWithInviter, VisitType } from "@/types/visitor.types";

const DAY_KEYS: RecurrenceDay[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const TERMINAL: ReadonlySet<string> = new Set(["completed", "cancelled", "rejected", "expired"]);

export function isStandingFrequent(visitor: VisitorWithInviter): boolean {
  return visitor.visit_type === "frequent" && visitor.recurrence !== null;
}

/** Whether a standing visit's recurrence and validity window cover `date`. */
export function standingAppliesOn(visitor: VisitorWithInviter, date: Date): boolean {
  if (TERMINAL.has(visitor.status)) return false;
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000 - 1);
  if (new Date(visitor.valid_from) > dayEnd || new Date(visitor.valid_until) < dayStart) return false;

  const dow = date.getDay();
  switch (visitor.recurrence) {
    case "daily":
      return true;
    case "mon_fri":
      return dow >= 1 && dow <= 5;
    case "mon_sat":
      return dow >= 1 && dow <= 6;
    case "custom":
      return (visitor.recurrence_days ?? []).includes(DAY_KEYS[dow]);
    default:
      return false;
  }
}

/**
 * One access-log entry rendered as a completed history row: the visitor's own
 * data, with the validity window replaced by the actual entry/exit times.
 */
export function movementToHistoryRow(visitor: VisitorWithInviter, log: AccessLogEntry): VisitorWithInviter {
  const entered = log.checked_in_at ?? log.created_at;
  return {
    ...visitor,
    id: `${visitor.id}:${log.id}`,
    status: "completed",
    valid_from: entered,
    valid_until: log.checked_out_at ?? entered,
  };
}

/**
 * What the UI calls a visit. The DB stores admin-registered visits as
 * "frequent" (no schema change, the resident app reads that column), but
 * without a recurrence they're a one-off visit, not a frequent one.
 */
export type DisplayVisitType = VisitType | "visit";

export function displayVisitType(visitor: VisitorWithInviter): DisplayVisitType {
  return visitor.visit_type === "frequent" && !isStandingFrequent(visitor) ? "visit" : visitor.visit_type;
}
