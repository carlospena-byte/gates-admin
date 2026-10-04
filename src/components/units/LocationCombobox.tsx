/**
 * Searchable "Location" picker — a single flat dropdown (same look as
 * UnitCombobox) listing every selectable location by its full path
 * ("Torre 1 → Piso 1"). Only leaf locations are offered, so the value
 * passed to `onChange` is always the id of the deepest location.
 */

import { useMemo, useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { cn, normalizeForSearch } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type { Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationComboboxProps {
  locations: Location[];
  /** Kept for API compatibility with existing callers. */
  locationTypes?: LocationTypeDefinition[];
  value: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
  label?: string;
}

export function LocationCombobox({ locations, value, onChange, disabled, label }: LocationComboboxProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const resolvedLabel = label ?? t("common.location");

  const entries = useMemo(() => {
    const active = locations.filter((l) => l.is_active);
    const parentIds = new Set(active.map((l) => l.parent_id).filter(Boolean));
    return active
      .filter((l) => !parentIds.has(l.id))
      .map((l) => ({ id: l.id, fullPath: getLocationFullPath(l, locations) }))
      .sort((a, b) => a.fullPath.localeCompare(b.fullPath, "es", { numeric: true }));
  }, [locations]);

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    return q ? entries.filter((e) => normalizeForSearch(e.fullPath).includes(q)) : entries;
  }, [entries, search]);

  const selected = entries.find((e) => e.id === value);

  if (entries.length === 0) {
    return (
      <div className="flex h-14 w-full items-center rounded-lg border border-input bg-gates-surface px-4 text-sm text-muted-foreground">
        {t("units.location.noneAvailable")}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-14 w-full items-center justify-between gap-2 rounded-lg border border-input bg-gates-surface px-4 py-1.5 text-sm ring-offset-background focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted"
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span className="text-[11px] font-medium leading-none text-muted-foreground">{resolvedLabel}</span>
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.fullPath : t("units.location.selectPlaceholder")}
            </span>
          </div>
          <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" portal={false}>
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("units.combobox.searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>{t("units.location.noOptionsFound")}</CommandEmpty>
            <CommandGroup>
              {!search && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <IconCheck className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  {t("common.none")}
                </CommandItem>
              )}
              {filtered.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.id}
                  onSelect={() => {
                    onChange(entry.id);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <IconCheck className={cn("mr-2 h-4 w-4", value === entry.id ? "opacity-100" : "opacity-0")} />
                  {entry.fullPath}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
