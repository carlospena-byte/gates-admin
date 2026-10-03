/**
 * Pure helpers for the guard (security role) visits view: how a visit's
 * window, unit/place and document state read on a card or row.
 */

import { getLocationFullPath } from "@/lib/locationHierarchy";
import type { UnitWithOwner } from "@/services";
import type { Locale } from "@/i18n/messages";
import type { Location } from "@/types/unit-wizard.types";
import type { DisplayVisitType } from "@/lib/standingVisit";
import type { VisitorWithInviter } from "@/types/visitor.types";

export type DocFilter = "all" | "ready" | "missing";

export type VisitTypeFilter = DisplayVisitType | "all";

export interface SecurityFilters {
  type: VisitTypeFilter;
  invitedBy: string;
  doc: DocFilter;
}

export const EMPTY_FILTERS: SecurityFilters = { type: "all", invitedBy: "", doc: "all" };

export const countActiveFilters = (f: SecurityFilters): number =>
  (f.type !== "all" ? 1 : 0) + (f.invitedBy.trim() ? 1 : 0) + (f.doc !== "all" ? 1 : 0);


export const hasDocument = (visitor: VisitorWithInviter): boolean => Boolean(visitor.id_photo_path);

/** Terminal statuses — no entry/exit actions apply. */
export const isClosedVisit = (visitor: VisitorWithInviter): boolean =>
  ["completed", "cancelled", "rejected", "expired"].includes(visitor.status);

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Hoy, 14:30–23:59" for same-day windows, "3 oct → 30 dic" over the closing time otherwise. */
export function visitWindow(fromISO: string, untilISO: string, locale: Locale): string {
  const intl = locale === "es" ? "es-ES" : "en-US";
  const from = new Date(fromISO);
  const until = new Date(untilISO);
  const time = new Intl.DateTimeFormat(intl, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const dayFmt = (d: Date) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short" }).format(d);

  if (startOfDay(from) === startOfDay(until)) {
    const diff = Math.round((startOfDay(from) - startOfDay(new Date())) / 86_400_000);
    const day =
      Math.abs(diff) <= 1
        ? new Intl.RelativeTimeFormat(intl, { numeric: "auto" }).format(diff, "day")
        : new Intl.DateTimeFormat(intl, { weekday: "short", day: "numeric", month: "short" }).format(from);
    return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${time.format(from)}–${time.format(until)}`;
  }
  return `${dayFmt(from)} → ${dayFmt(until)}, ${time.format(until)}`;
}

/** Unit name plus its tower/floor path ("Torre 1, Piso 1"). */
export function unitInfo(
  unitId: string | null,
  units: UnitWithOwner[],
  locations: Location[],
): { name: string; place: string } | null {
  const unit = unitId ? units.find((u) => u.id === unitId) : undefined;
  if (!unit) return null;
  const location = unit.location ? locations.find((l) => l.id === unit.location!.id) : null;
  return { name: unit.name, place: getLocationFullPath(location, locations, ", ") };
}

/** True when the unified search box matches the visitor's name, plate or unit. */
export function matchesSearch(
  visitor: VisitorWithInviter,
  query: string,
  units: UnitWithOwner[],
  locations: Location[],
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const unit = unitInfo(visitor.unit_id, units, locations);
  return [visitor.name, visitor.plate, unit?.name, unit?.place]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(q));
}
