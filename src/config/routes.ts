/**
 * Application Routes Configuration
 *
 * Centralized routing configuration for the Gates Admin application.
 */

import type { ResidentialRole } from "@/types/database.types";

// ============================================================================
// Route Types
// ============================================================================

export type RouteType =
  | "login"
  | "signup"
  | "platform"
  | "platformResidentials"
  | "platformResidentialDetail"
  | "platformPlans"
  | "platformProviders"
  | "platformAmenitiesCatalog"
  | "platformAdmins"
  | "platformAuditLog"
  | "residential"
  | "units"
  | "unitDetail"
  | "addonDetail"
  | "chargeDetail"
  | "residents"
  | "visitors"
  | "fastlanePublic"
  | "incidents"
  | "announcements"
  | "reservations"
  | "settingsUnitTypes"
  | "settingsLocationTypes"
  | "settingsAddonTypes"
  | "settingsLocations"
  | "settingsAddons"
  | "settingsIncidentTypes"
  | "settingsUsers";

/** Route ids that belong to the App Settings area, in the order they should be listed. */
export const SETTINGS_ROUTES: RouteType[] = [
  "settingsUnitTypes",
  "settingsLocationTypes",
  "settingsAddonTypes",
  "settingsLocations",
  "settingsAddons",
  "settingsIncidentTypes",
  "settingsUsers",
];

/** Route ids that belong to the Platform Admin area, in the order they should be listed. */
export const PLATFORM_ROUTES: RouteType[] = [
  "platform",
  "platformResidentials",
  "platformPlans",
  "platformProviders",
  "platformAmenitiesCatalog",
  "platformAdmins",
  "platformAuditLog",
];

export interface RouteConfig {
  /** Unique route identifier */
  id: RouteType;
  /** URL hash for this route (e.g., "#signup") */
  hash: string;
  /** Whether this route requires authentication */
  requiresAuth: boolean;
  /** Whether this route requires platform admin access */
  requiresPlatformAdmin?: boolean;
  /** Whether this route requires residential access */
  requiresResidentialAccess?: boolean;
}

// ============================================================================
// Route Definitions
// ============================================================================

export const ROUTES: Record<RouteType, RouteConfig> = {
  login: {
    id: "login",
    hash: "",
    requiresAuth: false,
  },
  signup: {
    id: "signup",
    hash: "#signup",
    requiresAuth: false,
  },
  platform: {
    id: "platform",
    hash: "#platform",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformResidentials: {
    id: "platformResidentials",
    hash: "#platform/residentials",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  // Dynamic route ("#platform/residentials/<id>"); see getCurrentRoute()/
  // getPlatformResidentialIdFromHash(). hash here is a placeholder only.
  platformResidentialDetail: {
    id: "platformResidentialDetail",
    hash: "#platform/residentials/:id",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformPlans: {
    id: "platformPlans",
    hash: "#platform/plans",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformProviders: {
    id: "platformProviders",
    hash: "#platform/providers",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformAmenitiesCatalog: {
    id: "platformAmenitiesCatalog",
    hash: "#platform/amenities-catalog",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformAdmins: {
    id: "platformAdmins",
    hash: "#platform/admins",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  platformAuditLog: {
    id: "platformAuditLog",
    hash: "#platform/audit-log",
    requiresAuth: true,
    requiresPlatformAdmin: true,
  },
  residential: {
    id: "residential",
    hash: "#residential",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  units: {
    id: "units",
    hash: "#units",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  residents: {
    id: "residents",
    hash: "#residents",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  visitors: {
    id: "visitors",
    hash: "#visitors",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  // Public, no session at all — the visitor opens this from an SMS/WhatsApp
  // link. Dynamic route ("#fastlane/<code>"); see getCurrentRoute()/
  // getFastlaneCodeFromHash(). hash here is a placeholder only.
  fastlanePublic: {
    id: "fastlanePublic",
    hash: "#fastlane/:code",
    requiresAuth: false,
  },
  incidents: {
    id: "incidents",
    hash: "#incidents",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  announcements: {
    id: "announcements",
    hash: "#announcements",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  reservations: {
    id: "reservations",
    hash: "#reservations",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  // Dynamic route ("#units/<id>"); see getCurrentRoute()/getUnitIdFromHash().
  // hash here is a placeholder only, unused by navigateToUnitDetail().
  unitDetail: {
    id: "unitDetail",
    hash: "#units/:id",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  // Dynamic route ("#addons/<id>"); see getCurrentRoute()/getAddonIdFromHash().
  // hash here is a placeholder only, unused by navigateToAddonDetail().
  addonDetail: {
    id: "addonDetail",
    hash: "#addons/:id",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  // Dynamic route ("#charges/<id>"); see getCurrentRoute()/getChargeIdFromHash().
  // hash here is a placeholder only, unused by navigateToChargeDetail().
  chargeDetail: {
    id: "chargeDetail",
    hash: "#charges/:id",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsUnitTypes: {
    id: "settingsUnitTypes",
    hash: "#settings/unit-types",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsLocationTypes: {
    id: "settingsLocationTypes",
    hash: "#settings/location-types",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsAddonTypes: {
    id: "settingsAddonTypes",
    hash: "#settings/addon-types",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsLocations: {
    id: "settingsLocations",
    hash: "#settings/locations",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsAddons: {
    id: "settingsAddons",
    hash: "#settings/addons",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsIncidentTypes: {
    id: "settingsIncidentTypes",
    hash: "#settings/incident-types",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
  settingsUsers: {
    id: "settingsUsers",
    hash: "#settings/users",
    requiresAuth: true,
    requiresResidentialAccess: true,
  },
};

// ============================================================================
// Route Utilities
// ============================================================================

const UNIT_DETAIL_HASH_PREFIX = "#units/";
const ADDON_DETAIL_HASH_PREFIX = "#addons/";
const CHARGE_DETAIL_HASH_PREFIX = "#charges/";
const FASTLANE_PUBLIC_HASH_PREFIX = "#fastlane/";
const PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX = "#platform/residentials/";

/**
 * Get the current route based on the URL hash
 */
export function getCurrentRoute(): RouteType {
  const hash = window.location.hash;

  if (hash.startsWith(UNIT_DETAIL_HASH_PREFIX) && hash.length > UNIT_DETAIL_HASH_PREFIX.length) {
    return "unitDetail";
  }

  if (hash.startsWith(ADDON_DETAIL_HASH_PREFIX) && hash.length > ADDON_DETAIL_HASH_PREFIX.length) {
    return "addonDetail";
  }

  if (hash.startsWith(CHARGE_DETAIL_HASH_PREFIX) && hash.length > CHARGE_DETAIL_HASH_PREFIX.length) {
    return "chargeDetail";
  }

  if (hash.startsWith(FASTLANE_PUBLIC_HASH_PREFIX) && hash.length > FASTLANE_PUBLIC_HASH_PREFIX.length) {
    return "fastlanePublic";
  }

  if (
    hash.startsWith(PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX) &&
    hash.length > PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX.length
  ) {
    return "platformResidentialDetail";
  }

  // Find matching route by hash
  const route = Object.values(ROUTES).find((r) => r.hash === hash);

  // Default to login if no match
  return route?.id ?? "login";
}

/**
 * Extract the unit id from a "#units/<id>" hash. Returns null when the
 * current route isn't unitDetail.
 */
export function getUnitIdFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(UNIT_DETAIL_HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(UNIT_DETAIL_HASH_PREFIX.length)) || null;
}

/**
 * Extract the addon id from a "#addons/<id>" hash. Returns null when the
 * current route isn't addonDetail.
 */
export function getAddonIdFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(ADDON_DETAIL_HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(ADDON_DETAIL_HASH_PREFIX.length)) || null;
}

/**
 * Extract the charge id from a "#charges/<id>" hash. Returns null when the
 * current route isn't chargeDetail.
 */
export function getChargeIdFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(CHARGE_DETAIL_HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(CHARGE_DETAIL_HASH_PREFIX.length)) || null;
}

/**
 * Extract the FastLane access code from a "#fastlane/<code>" hash. Returns
 * null when the current route isn't fastlanePublic.
 */
export function getFastlaneCodeFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(FASTLANE_PUBLIC_HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(FASTLANE_PUBLIC_HASH_PREFIX.length)) || null;
}

/**
 * Extract the residential id from a "#platform/residentials/<id>" hash.
 * Returns null when the current route isn't platformResidentialDetail.
 */
export function getPlatformResidentialIdFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith(PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX.length)) || null;
}

/**
 * Navigate to a specific residential's detail page within Platform Admin.
 */
export function navigateToPlatformResidentialDetail(residentialId: string): void {
  window.location.hash = `${PLATFORM_RESIDENTIAL_DETAIL_HASH_PREFIX}${encodeURIComponent(residentialId)}`;
}

/**
 * Navigate to a specific route
 */
export function navigateTo(route: RouteType): void {
  window.location.hash = ROUTES[route].hash;
}

/**
 * Navigate to a specific unit's detail page.
 */
export function navigateToUnitDetail(unitId: string): void {
  window.location.hash = `${UNIT_DETAIL_HASH_PREFIX}${encodeURIComponent(unitId)}`;
}

/**
 * Navigate to a specific addon's internal-items screen.
 */
export function navigateToAddonDetail(addonId: string): void {
  window.location.hash = `${ADDON_DETAIL_HASH_PREFIX}${encodeURIComponent(addonId)}`;
}

/**
 * Navigate to a specific charge's assignment screen.
 */
export function navigateToChargeDetail(chargeId: string): void {
  window.location.hash = `${CHARGE_DETAIL_HASH_PREFIX}${encodeURIComponent(chargeId)}`;
}

/**
 * Get the route configuration for a specific route
 */
export function getRoute(route: RouteType): RouteConfig {
  return ROUTES[route];
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(route: RouteType): boolean {
  return ROUTES[route].requiresAuth;
}

/**
 * Check if a route requires platform admin access
 */
export function requiresPlatformAdmin(route: RouteType): boolean {
  return ROUTES[route].requiresPlatformAdmin ?? false;
}

/**
 * Check if a route requires residential access
 */
export function requiresResidentialAccess(route: RouteType): boolean {
  return ROUTES[route].requiresResidentialAccess ?? false;
}

/**
 * Check if a route belongs to the App Settings area
 */
export function isSettingsRoute(route: RouteType): boolean {
  return SETTINGS_ROUTES.includes(route);
}

/**
 * Check if a route belongs to the Platform Admin area (including the
 * dynamic residential-detail route, which isn't listed in PLATFORM_ROUTES
 * since it's not directly navigable from a nav item).
 */
export function isPlatformRoute(route: RouteType): boolean {
  return PLATFORM_ROUTES.includes(route) || route === "platformResidentialDetail";
}

// ============================================================================
// Role-based Access
// ============================================================================

/** Routes the "security" role is allowed to access. Every other residential role can access every route. */
const SECURITY_ROLE_ROUTES: RouteType[] = ["visitors", "reservations", "incidents", "announcements"];

/**
 * Check if a route is allowed for a given residential role.
 */
export function isRouteAllowedForRole(route: RouteType, role: ResidentialRole): boolean {
  if (role === "security") {
    return SECURITY_ROLE_ROUTES.includes(route);
  }
  return true;
}

/**
 * Get the route a role should land on when its current route isn't allowed.
 */
export function getDefaultRouteForRole(role: ResidentialRole): RouteType {
  if (role === "security") {
    return "visitors";
  }
  return "residential";
}
