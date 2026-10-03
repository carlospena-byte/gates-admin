/**
 * Residential navigation sections. The sidebar shows one entry per section;
 * pages that belong to the same section show sibling tabs (SectionTabs) so the
 * admin moves between related screens without going back to the sidebar.
 */

import type { ComponentType } from "react";
import {
  IconAlertTriangle,
  IconBuildings,
  IconCash,
  IconHome,
  IconSpeakerphone,
  IconUserCheck,
  type IconProps,
} from "@tabler/icons-react";

import type { MessageKey } from "@/i18n/messages";
import { isRouteAllowedForRole, type RouteType } from "@/config/routes";
import type { ResidentialRole } from "@/types/database.types";

export type SectionId = "home" | "community" | "access" | "billing" | "operations" | "communications";

export interface NavSection {
  id: SectionId;
  labelKey: MessageKey;
  icon: ComponentType<IconProps>;
  /** Tab pages of the section, in display order. The first allowed one is the sidebar link target. */
  routes: { route: RouteType; labelKey: MessageKey }[];
  /** Extra routes (detail pages) that keep the section highlighted. */
  alsoActiveOn?: RouteType[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "home",
    labelKey: "appSidebar.nav.home",
    icon: IconHome,
    routes: [{ route: "residential", labelKey: "appSidebar.nav.home" }],
  },
  {
    id: "community",
    labelKey: "appSidebar.section.community",
    icon: IconBuildings,
    routes: [
      { route: "units", labelKey: "appSidebar.nav.units" },
      { route: "residents", labelKey: "appSidebar.nav.residents" },
    ],
    alsoActiveOn: ["unitDetail"],
  },
  {
    id: "access",
    labelKey: "appSidebar.section.access",
    icon: IconUserCheck,
    routes: [{ route: "visitors", labelKey: "appSidebar.nav.visitors" }],
  },
  {
    id: "billing",
    labelKey: "appSidebar.section.billing",
    icon: IconCash,
    routes: [{ route: "billing", labelKey: "appSidebar.nav.billing" }],
    alsoActiveOn: ["chargeDetail"],
  },
  {
    id: "operations",
    labelKey: "appSidebar.section.operations",
    icon: IconAlertTriangle,
    routes: [
      { route: "incidents", labelKey: "appSidebar.nav.incidents" },
      { route: "reservations", labelKey: "appSidebar.nav.reservations" },
      { route: "amenities", labelKey: "appSidebar.nav.amenities" },
    ],
  },
  {
    id: "communications",
    labelKey: "appSidebar.section.communications",
    icon: IconSpeakerphone,
    routes: [
      { route: "announcements", labelKey: "appSidebar.nav.announcements" },
      { route: "bulletins", labelKey: "appSidebar.nav.bulletins" },
    ],
  },
];

export function getSection(id: SectionId): NavSection {
  return NAV_SECTIONS.find((section) => section.id === id) as NavSection;
}

export function getAllowedSectionRoutes(section: NavSection, role: ResidentialRole) {
  return section.routes.filter((entry) => isRouteAllowedForRole(entry.route, role));
}

export function isSectionActive(section: NavSection, currentRoute: RouteType): boolean {
  return section.routes.some((entry) => entry.route === currentRoute) || Boolean(section.alsoActiveOn?.includes(currentRoute));
}
