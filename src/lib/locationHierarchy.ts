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

export function getLocationTypeLabel(
  typeCode: string,
  locationTypes: LocationTypeDefinition[],
): string {
  return locationTypes.find((t) => t.code === typeCode)?.name || typeCode;
}

export function getParentLocationTypeOptions(
  locations: Location[],
  locationTypes: LocationTypeDefinition[],
): { code: string; name: string }[] {
  if (locationTypes.length) return locationTypes.map((t) => ({ code: t.code, name: t.name }));
  const codes = Array.from(new Set(locations.map((l) => l.type))).sort();
  return codes.map((code) => ({ code, name: code }));
}

/**
 * Label for a location entry in a flat "pick a parent" dropdown, e.g.
 * "Floor 3 (Floor - Parent: Tower A)".
 */
export function getLocationOptionLabel(
  location: Location,
  locations: Location[],
  locationTypes: LocationTypeDefinition[],
): string {
  const typeName = getLocationTypeLabel(location.type, locationTypes);
  const parentName = location.parent_id
    ? locations.find((l) => l.id === location.parent_id)?.name
    : null;
  return parentName ? `${location.name} (${typeName} - Parent: ${parentName})` : `${location.name} (${typeName})`;
}
