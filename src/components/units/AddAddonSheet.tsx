/**
 * Right-side sheet for picking addon items to assign to a unit. Filtering
 * logic (location cascade + addon type) mirrors AddonItemPicker; this just
 * adds a search box, excludes already-assigned items, and multi-selects
 * into a local draft that's only reported to the parent on "Add selected".
 */

import { useMemo, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getAddonTypeIcon } from "@/lib/addonTypeIcon";
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

interface AddAddonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addonItems: AddonItem[];
  addonTypes: AddonType[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  assignedIds: string[];
  onAdd: (ids: string[]) => void;
  disabled?: boolean;
}

export function AddAddonSheet({
  open,
  onOpenChange,
  addonItems,
  addonTypes,
  locations,
  locationTypes,
  assignedIds,
  onAdd,
  disabled,
}: AddAddonSheetProps) {
  const { t } = useI18n();
  const [addonTypeId, setAddonTypeId] = useState(ALL);
  const [locationTypeCode, setLocationTypeCode] = useState(ALL);
  const [locationId, setLocationId] = useState(ALL);
  const [subLocationId, setSubLocationId] = useState(ALL);
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  // Discard the draft (filters + selection) on any dismissal — Cancel, the
  // X button, overlay click, or Escape — so it never leaks into the next open.
  const resetDraft = () => {
    setAddonTypeId(ALL);
    setLocationTypeCode(ALL);
    setLocationId(ALL);
    setSubLocationId(ALL);
    setSearch("");
    setPendingIds([]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetDraft();
    onOpenChange(nextOpen);
  };

  const sortedLocationTypes = useMemo(() => sortLocationTypesByLevel(locationTypes), [locationTypes]);

  const locationOptions = useMemo(
    () =>
      locations
        .filter((l) => l.is_active && (locationTypeCode === ALL || l.type === locationTypeCode))
        .sort((a, b) => getLocationFullPath(a, locations).localeCompare(getLocationFullPath(b, locations))),
    [locations, locationTypeCode],
  );

  const effectiveLocationId = locationOptions.some((l) => l.id === locationId) ? locationId : ALL;

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
    : t("units.addSheet.floorFallback");
  const allOfSubLocationLabel = t("units.addSheet.allOfLabel", { label: subLocationLabel });

  const targetLocationId = effectiveSubLocationId !== ALL ? effectiveSubLocationId : effectiveLocationId;

  const allowedLocationIds = useMemo(
    () => (targetLocationId === ALL ? null : new Set(getDescendantLocationIds(targetLocationId, locations))),
    [targetLocationId, locations],
  );

  const availableItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return addonItems.filter((item) => {
      if (!item.is_active) return false;
      if (assignedIds.includes(item.id)) return false;
      if (allowedLocationIds) {
        if (!item.location_id || !allowedLocationIds.has(item.location_id)) return false;
      } else if (locationTypeCode !== ALL && item.locations?.type !== locationTypeCode) {
        return false;
      }
      if (addonTypeId !== ALL && item.addons?.addon_type_id !== addonTypeId) return false;
      if (query) {
        const haystack = [
          item.name,
          item.addons?.name,
          item.addons?.addon_types?.name,
          item.locations ? getLocationFullPath(item.locations, locations) : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [addonItems, assignedIds, allowedLocationIds, locationTypeCode, addonTypeId, search, locations]);

  const togglePending = (id: string) => {
    setPendingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleAdd = () => {
    if (pendingIds.length === 0) return;
    onAdd(pendingIds);
    resetDraft();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[420px]">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{t("units.addSheet.title")}</SheetTitle>
          <SheetDescription>{t("units.addSheet.description")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("units.addSheet.filters")}</p>
            <div className="grid grid-cols-1 gap-2">
              <Select value={addonTypeId} onValueChange={setAddonTypeId} disabled={disabled}>
                <SelectTrigger label={t("units.addSheet.addonType")}>
                  <SelectValue placeholder={t("units.addSheet.allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("units.addSheet.allTypes")}</SelectItem>
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
                <SelectTrigger label={t("units.addSheet.locationType")}>
                  <SelectValue placeholder={t("units.addSheet.allLocationTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("units.addSheet.allLocationTypes")}</SelectItem>
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
                  <SelectValue placeholder={t("units.addSheet.allLocations")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("units.addSheet.allLocations")}</SelectItem>
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

            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("units.addSheet.searchPlaceholder")}
                className="pl-9"
                disabled={disabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">
              {t("units.addSheet.availableTitle")}
              <span className="ml-2 text-muted-foreground">({availableItems.length})</span>
            </p>

            {availableItems.length === 0 ? (
              <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
                {t("units.addSheet.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {availableItems.map((item) => {
                  const Icon = getAddonTypeIcon(item.addons?.addon_types?.name);
                  const checked = pendingIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-accent",
                        checked && "border-primary bg-accent",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePending(item.id)}
                        disabled={disabled}
                        className="mt-1 h-4 w-4"
                        aria-label={t("units.addSheet.selectItemAria", { name: item.name })}
                      />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {item.addons?.name} — {item.name}
                          </span>
                          <span className="shrink-0 text-sm font-medium">{formatCurrency(item.price)}</span>
                        </span>
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">
                            {item.addons?.addon_types?.name || "—"}
                          </span>
                          {item.price !== null && (
                            <span className="shrink-0 text-xs text-muted-foreground">{t("units.addSheet.perMonth")}</span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.locations ? getLocationFullPath(item.locations, locations) : t("units.common.noLocation")}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={disabled}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={disabled || pendingIds.length === 0}>
            {t("units.addSheet.addSelected", { count: pendingIds.length })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
