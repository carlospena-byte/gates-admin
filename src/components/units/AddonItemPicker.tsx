/**
 * Filterable, multi-select table for assigning addon items to a unit.
 * Used by both UnitCreateForm and UnitDetailPage instead of a flat
 * unfiltered checkbox list.
 */

import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getLocationFullPath, sortLocationTypesByLevel } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import type { AddonItem, AddonType, Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

const ALL = "__all__";

interface AddonItemPickerProps {
  addonItems: AddonItem[];
  addonTypes: AddonType[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  selectedIds: string[];
  onToggle: (addonItemId: string) => void;
  onSetSelected: (ids: string[]) => void;
  disabled?: boolean;
}

export function AddonItemPicker({
  addonItems,
  addonTypes,
  locations,
  locationTypes,
  selectedIds,
  onToggle,
  onSetSelected,
  disabled,
}: AddonItemPickerProps) {
  const [locationTypeCode, setLocationTypeCode] = useState(ALL);
  const [locationId, setLocationId] = useState(ALL);
  const [addonTypeId, setAddonTypeId] = useState(ALL);

  const sortedLocationTypes = useMemo(() => sortLocationTypesByLevel(locationTypes), [locationTypes]);

  const locationOptions = useMemo(
    () =>
      locations
        .filter((l) => l.is_active && (locationTypeCode === ALL || l.type === locationTypeCode))
        .sort((a, b) => getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations))),
    [locations, locationTypeCode],
  );

  // Reset the location filter if it no longer matches the selected location type.
  const effectiveLocationId = locationOptions.some((l) => l.id === locationId) ? locationId : ALL;

  const activeItems = useMemo(() => addonItems.filter((item) => item.is_active), [addonItems]);

  const filteredItems = useMemo(
    () =>
      activeItems.filter((item) => {
        if (locationTypeCode !== ALL && item.locations?.type !== locationTypeCode) return false;
        if (effectiveLocationId !== ALL && item.location_id !== effectiveLocationId) return false;
        if (addonTypeId !== ALL && item.addons?.addon_type_id !== addonTypeId) return false;
        return true;
      }),
    [activeItems, locationTypeCode, effectiveLocationId, addonTypeId],
  );

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredItems.map((item) => item.id);
    if (allFilteredSelected) {
      onSetSelected(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      onSetSelected(Array.from(new Set([...selectedIds, ...filteredIds])));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Addons (optional)</label>
        {selectedIds.length > 0 && (
          <span className="text-xs text-muted-foreground">{selectedIds.length} selected</span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          value={locationTypeCode}
          onValueChange={(v) => {
            setLocationTypeCode(v);
            setLocationId(ALL);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Location type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All location types</SelectItem>
            {sortedLocationTypes.map((type) => (
              <SelectItem key={type.id} value={type.code}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={effectiveLocationId} onValueChange={setLocationId} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All locations</SelectItem>
            {locationOptions.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {getLocationFullPath(location, locations)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={addonTypeId} onValueChange={setAddonTypeId} disabled={disabled}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Addon type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All addon types</SelectItem>
            {addonTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md max-h-64 overflow-y-auto">
        {filteredItems.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={handleSelectAllFiltered}
                    disabled={disabled}
                    className="h-4 w-4"
                    aria-label="Select all filtered addons"
                  />
                </TableHead>
                <TableHead>Addon</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[100px]">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => !disabled && onToggle(item.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => onToggle(item.id)}
                      disabled={disabled}
                      className="h-4 w-4"
                      aria-label={`Select ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.addons?.name} — {item.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.locations ? getLocationFullPath(item.locations, locations) : "No location"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-3 text-sm text-muted-foreground">No addons match these filters.</p>
        )}
      </div>
    </div>
  );
}
