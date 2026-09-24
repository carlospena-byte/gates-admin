/**
 * Filterable, multi-select table for assigning addon items to a unit.
 * Used by both UnitCreateForm and UnitDetailPage instead of a flat
 * unfiltered checkbox list.
 */

import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getDescendantLocationIds,
  getLocationFullPath,
  getLocationTypeLabel,
  sortLocationTypesByLevel,
} from "@/lib/locationHierarchy";
import { cn, formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
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
  const { t } = useI18n();
  const [locationTypeCode, setLocationTypeCode] = useState(ALL);
  const [locationId, setLocationId] = useState(ALL);
  const [subLocationId, setSubLocationId] = useState(ALL);
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

  // Children of the selected location (e.g. the floors under a selected tower)
  // — surfaced as an extra drill-down select once a location is chosen.
  const subLocationOptions = useMemo(
    () =>
      effectiveLocationId === ALL
        ? []
        : locations
            .filter((l) => l.is_active && l.parent_id === effectiveLocationId)
            .sort((a, b) => a.name.localeCompare(b.name)),
    [locations, effectiveLocationId],
  );

  const effectiveSubLocationId = subLocationOptions.some((l) => l.id === subLocationId) ? subLocationId : ALL;
  const subLocationLabel = subLocationOptions.length
    ? getLocationTypeLabel(subLocationOptions[0].type, locationTypes)
    : "";
  const allOfSubLocationLabel = t("units.addonPicker.allOfLabel", { label: subLocationLabel });

  // The most specific location actually chosen — a floor if picked, else the tower itself.
  const targetLocationId = effectiveSubLocationId !== ALL ? effectiveSubLocationId : effectiveLocationId;

  const allowedLocationIds = useMemo(
    () => (targetLocationId === ALL ? null : new Set(getDescendantLocationIds(targetLocationId, locations))),
    [targetLocationId, locations],
  );

  const activeItems = useMemo(() => addonItems.filter((item) => item.is_active), [addonItems]);

  const filteredItems = useMemo(
    () =>
      activeItems.filter((item) => {
        if (allowedLocationIds) {
          if (!item.location_id || !allowedLocationIds.has(item.location_id)) return false;
        } else if (locationTypeCode !== ALL && item.locations?.type !== locationTypeCode) {
          return false;
        }
        if (addonTypeId !== ALL && item.addons?.addon_type_id !== addonTypeId) return false;
        return true;
      }),
    [activeItems, allowedLocationIds, locationTypeCode, addonTypeId],
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
        <label className="text-sm font-medium">{t("units.addonPicker.title")}</label>
        {selectedIds.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {t("units.addonPicker.selectedCount", { count: selectedIds.length })}
          </span>
        )}
      </div>

      <div className={cn("grid gap-2 sm:grid-cols-3", subLocationOptions.length > 0 && "lg:grid-cols-4")}>
        <Select value={addonTypeId} onValueChange={setAddonTypeId} disabled={disabled}>
          <SelectTrigger label={t("units.addonPicker.addonType")}>
            <SelectValue placeholder={t("units.addonPicker.allAddonTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("units.addonPicker.allAddonTypes")}</SelectItem>
            {addonTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationTypeCode}
          onValueChange={(v) => {
            setLocationTypeCode(v);
            setLocationId(ALL);
            setSubLocationId(ALL);
          }}
          disabled={disabled}
        >
          <SelectTrigger label={t("units.addonPicker.locationType")}>
            <SelectValue placeholder={t("units.addonPicker.allLocationTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("units.addonPicker.allLocationTypes")}</SelectItem>
            {sortedLocationTypes.map((type) => (
              <SelectItem key={type.id} value={type.code}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={effectiveLocationId}
          onValueChange={(v) => {
            setLocationId(v);
            setSubLocationId(ALL);
          }}
          disabled={disabled}
        >
          <SelectTrigger label={t("common.location")}>
            <SelectValue placeholder={t("units.addonPicker.allLocations")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("units.addonPicker.allLocations")}</SelectItem>
            {locationOptions.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {getLocationFullPath(location, locations)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {subLocationOptions.length > 0 && (
          <Select value={effectiveSubLocationId} onValueChange={setSubLocationId} disabled={disabled}>
            <SelectTrigger label={subLocationLabel}>
              <SelectValue placeholder={allOfSubLocationLabel} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{allOfSubLocationLabel}</SelectItem>
              {subLocationOptions.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                    aria-label={t("units.addonPicker.selectAllAria")}
                  />
                </TableHead>
                <TableHead>{t("units.addonPicker.columnAddon")}</TableHead>
                <TableHead>{t("common.location")}</TableHead>
                <TableHead className="w-[100px]">{t("common.price")}</TableHead>
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
                      aria-label={t("units.addonPicker.selectItemAria", { name: item.name })}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.addons?.name} — {item.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.locations ? getLocationFullPath(item.locations, locations) : t("units.common.noLocation")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatCurrency(item.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-3 text-sm text-muted-foreground">{t("units.addonPicker.empty")}</p>
        )}
      </div>
    </div>
  );
}
