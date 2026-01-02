/**
 * Application Routes Configuration
 *
 * Centralized routing configuration for the Gates Admin application.
 */

// ============================================================================
// Route Types
// ============================================================================

export type RouteType = "login" | "signup" | "platform" | "residential" | "units";

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
};

// ============================================================================
// Route Utilities
// ============================================================================

/**
 * Get the current route based on the URL hash
 */
export function getCurrentRoute(): RouteType {
  const hash = window.location.hash;

  // Find matching route by hash
  const route = Object.values(ROUTES).find((r) => r.hash === hash);

  // Default to login if no match
  return route?.id ?? "login";
}

/**
 * Navigate to a specific route
 */
export function navigateTo(route: RouteType): void {
  window.location.hash = ROUTES[route].hash;
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
