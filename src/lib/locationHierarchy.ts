/**
 * Pure helpers for walking the parent/child location tree.
 * Extracted out of UnitManager so they don't depend on component state.
 */

import type { Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

export function getLocationFullPath(
  location: Location | null | undefined,
  locations: Location[],
): string {
  if (!location) return "";

  const parts: string[] = [];
  let current: Location | undefined = location;

  while (current) {
    parts.unshift(current.name);
    const parentId: string | null = current.parent_id;
    current = parentId ? locations.find((l) => l.id === parentId) : undefined;
  }

  return parts.join(" → ");
}

export function locationHasChildren(locationId: string, locations: Location[]): boolean {
  return locations.some((l) => l.parent_id === locationId);
}

/**
 * `locationId` plus every location nested under it, at any depth. Used to
 * resolve "all units under Torre A" to the full set of matching location ids
 * (Torre A itself, its floors, etc.), since units may be assigned at any
 * level of the hierarchy.
 */
export function getDescendantLocationIds(locationId: string, locations: Location[]): string[] {
  const ids = [locationId];
  for (const child of locations.filter((l) => l.parent_id === locationId)) {
    ids.push(...getDescendantLocationIds(child.id, locations));
  }
  return ids;
}

export function getLocationTypeLabel(
  typeCode: string,
  locationTypes: LocationTypeDefinition[],
): string {
  return locationTypes.find((t) => t.code === typeCode)?.name || typeCode;
}

/**
 * Top-of-hierarchy type options (e.g. Edificio, Bloque) — the only types a
 * unit or location may start from before drilling down level by level.
 */
export function getParentLocationTypeOptions(
  locations: Location[],
  locationTypes: LocationTypeDefinition[],
): { code: string; name: string }[] {
  if (locationTypes.length) {
    const minLevel = Math.min(...locationTypes.map((t) => t.level));
    return locationTypes
      .filter((t) => t.level === minLevel)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({ code: t.code, name: t.name }));
  }
  const codes = Array.from(new Set(locations.map((l) => l.type))).sort();
  return codes.map((code) => ({ code, name: code }));
}

/** All location types, ordered mayor→menor (top of the hierarchy first). */
export function sortLocationTypesByLevel(
  locationTypes: LocationTypeDefinition[],
): LocationTypeDefinition[] {
  return [...locationTypes].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

/** Whether a location of this type must have a parent (i.e. isn't top-level). */
export function typeRequiresParent(
  typeCode: string,
  locationTypes: LocationTypeDefinition[],
): boolean {
  const type = locationTypes.find((t) => t.code === typeCode);
  return !!type && type.level > 1;
}

/**
 * Active locations eligible as the parent of a new/edited location of
 * `typeCode` — i.e. locations whose own type sits exactly one level up.
 * Empty when `typeCode` is top-level (no parent allowed).
 */
export function getEligibleParentLocations(
  typeCode: string,
  locations: Location[],
  locationTypes: LocationTypeDefinition[],
  excludeLocationId?: string,
): Location[] {
  const type = locationTypes.find((t) => t.code === typeCode);
  if (!type || type.level <= 1) return [];

  const parentLevel = type.level - 1;
  const parentCodes = new Set(
    locationTypes.filter((t) => t.level === parentLevel).map((t) => t.code),
  );

  return locations
    .filter((l) => l.is_active && l.id !== excludeLocationId && parentCodes.has(l.type))
    .sort((a, b) => getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations)));
}
