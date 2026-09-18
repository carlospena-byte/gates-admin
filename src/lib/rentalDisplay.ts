/**
 * Shared display helpers for rentals — used by the rentals list, the
 * detail sheet, and the history sheet so labels/colors stay consistent
 * across all three.
 */

import type { RentalStatus, RentalType } from "@/types/unit-wizard.types";

export const RENTAL_TYPE_LABEL: Record<RentalType, string> = {
  monthly: "Monthly",
  short_term: "Short-term",
};

export const RENTAL_STATUS_VARIANT: Record<RentalStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "outline",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
};

/** Statuses shown in the main rentals list; everything else lives in the history sheet. */
export const ACTIVE_RENTAL_STATUSES: RentalStatus[] = ["pending", "active"];

/** Up to two initials from a name, for a compact avatar circle (e.g. "Carlos Peña" -> "CP"). */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
