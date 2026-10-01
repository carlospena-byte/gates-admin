/**
 * Searchable unit picker — a plain <Select> doesn't scale once a
 * residential has hundreds of units (endless scroll, no search). Same
 * Command + Popover combobox pattern as LocationCombobox.tsx: type to
 * filter across each unit's full path label ("Torre 1 → Piso 1 → 101"),
 * grouped by top-level building/tower so the list stays scannable even
 * unfiltered.
 */

import { useMemo, useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getUnitFullLabel } from "@/lib/locationHierarchy";
import { cn, normalizeForSearch } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";
import type { Location } from "@/types/unit-wizard.types";

interface UnitComboboxProps {
  units: UnitWithOwner[];
  locations: Location[];
  value: string;
  onChange: (unitId: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

const UNGROUPED_KEY = "__ungrouped__";

function getTopLevelLocation(location: Location | null, locations: Location[]): Location | null {
  if (!location) return null;
  let current = location;
  while (current.parent_id) {
    const parent = locations.find((l) => l.id === current.parent_id);
    if (!parent) break;
    current = parent;
  }
  return current;
}

interface UnitEntry {
  unit: UnitWithOwner;
  fullLabel: string;
  groupKey: string;
  groupName: string;
}

export function UnitCombobox({ units, locations, value, onChange, disabled, label, placeholder }: UnitComboboxProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const resolvedLabel = label ?? t("common.unit");

  const entries: UnitEntry[] = useMemo(
    () =>
      units.map((unit) => {
        const fullLocation = unit.location ? (locations.find((l) => l.id === unit.location!.id) ?? null) : null;
        const top = getTopLevelLocation(fullLocation, locations);
        return {
          unit,
          fullLabel: getUnitFullLabel(unit.name, fullLocation, locations),
          groupKey: top?.id ?? UNGROUPED_KEY,
          groupName: top?.name ?? t("units.common.noLocation"),
        };
      }),
    [units, locations, t],
  );

  const filtered = useMemo(() => {
    const q = normalizeForSearch(search);
    if (!q) return entries;
    return entries.filter((e) => normalizeForSearch(e.fullLabel).includes(q));
  }, [entries, search]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: UnitEntry[] }>();
    for (const entry of filtered) {
      const group = map.get(entry.groupKey);
      if (group) group.items.push(entry);
      else map.set(entry.groupKey, { name: entry.groupName, items: [entry] });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [filtered]);

  const selected = entries.find((e) => e.unit.id === value);

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
              {selected ? selected.fullLabel : (placeholder ?? t("residents.create.selectUnitPlaceholder"))}
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
            {groups.map((group) => (
              <CommandGroup key={group.name} heading={group.name}>
                {group.items.map((entry) => (
                  <CommandItem
                    key={entry.unit.id}
                    value={entry.unit.id}
                    onSelect={() => {
                      onChange(entry.unit.id);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <IconCheck
                      className={cn("mr-2 h-4 w-4", value === entry.unit.id ? "opacity-100" : "opacity-0")}
                    />
                    {entry.fullLabel}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
