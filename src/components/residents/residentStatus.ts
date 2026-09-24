/**
 * Shared badge styling + i18n label lookup for ResidentStatus, used by both
 * ResidentTable (residential-wide) and UnitResidentsPanel (per-unit).
 */
import type { ResidentStatus } from "@/types/unit-wizard.types";

export const RESIDENT_STATUS_BADGE_VARIANT: Record<ResidentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  invited: "secondary",
  expired: "destructive",
  not_invited: "outline",
};

export function residentStatusMessageKey(status: ResidentStatus) {
  return `residents.table.status.${status}` as const;
}
