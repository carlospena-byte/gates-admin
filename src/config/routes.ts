/**
 * Application Routes Configuration
 *
 * Centralized routing configuration for the Gates Admin application.
 */

// ============================================================================
// Route Types
// ============================================================================

export type RouteType =
  | "login"
  | "signup"
  | "platform"
  | "residential"
  | "units"
  | "unitDetail"
  | "addonDetail"
  | "chargeDetail"
  | "residents"
  | "visitors"
  | "incidents"
  | "announcements"
  | "reservations"
  | "settingsUnitTypes"
  | "settingsLocationTypes"
  | "settingsAddonTypes"
  | "settingsLocations"
  | "settingsAddons"
  | "settingsUsers";

/** Route ids that belong to the App Settings area, in the order they should be listed. */
export const SETTINGS_ROUTES: RouteType[] = [
  "settingsUnitTypes",
  "settingsLocationTypes",
  "settingsAddonTypes",
  "settingsLocations",
  "settingsAddons",
  "settingsUsers",
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
