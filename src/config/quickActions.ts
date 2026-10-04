import type { MessageKey } from "@/i18n/messages";
import { isRouteAllowedForRole } from "@/config/routes";
import { CREATE_INTENT_ROUTES, type CreateIntent } from "@/lib/createIntent";
import { canCreateReservation, canManageResidential } from "@/state/useAccess";
import type { ResidentialRole } from "@/types/database.types";

export interface QuickAction {
  intent: CreateIntent;
  labelKey: MessageKey;
  /** Who may create: owner/admin, anyone who can book (not security), or any role that can open the page. */
  gate: "any" | "manage" | "reserve";
}

export const QUICK_ACTIONS: QuickAction[] = [
  { intent: "visitor", labelKey: "quick.visitor", gate: "manage" },
  { intent: "incident", labelKey: "quick.incident", gate: "any" },
  { intent: "reservation", labelKey: "quick.reservation", gate: "reserve" },
  { intent: "resident", labelKey: "quick.resident", gate: "manage" },
  { intent: "unit", labelKey: "quick.unit", gate: "manage" },
  { intent: "announcement", labelKey: "quick.announcement", gate: "manage" },
  { intent: "bulletin", labelKey: "quick.bulletin", gate: "manage" },
  { intent: "amenity", labelKey: "quick.amenity", gate: "manage" },
];

export function getQuickActionsForRole(role: ResidentialRole | undefined): QuickAction[] {
  if (!role) return QUICK_ACTIONS;
  return QUICK_ACTIONS.filter(
    (action) =>
      isRouteAllowedForRole(CREATE_INTENT_ROUTES[action.intent], role) &&
      (action.gate === "any" ||
        (action.gate === "manage" && canManageResidential(role)) ||
        (action.gate === "reserve" && canCreateReservation(role))),
  );
}
