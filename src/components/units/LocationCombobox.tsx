/**
 * Cascading "Location" picker — pick level 1 first, then level 2 (and
 * beyond) only appears once the selected parent actually has children.
 * Each level is its own searchable dropdown. The value passed to
 * `onChange` is always the id of the deepest (leaf) location selected.
 */

import { useEffect, useMemo, useState } from "react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getLocationTypeLabel } from "@/lib/locationHierarchy";
import { cn } from "@/lib/utils";
import type { Location, LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationComboboxProps {
  locations: Location[];
  locationTypes?: LocationTypeDefinition[];
  value: string;
  onChange: (locationId: string) => void;
  disabled?: boolean;
  label?: string;
}

interface LevelStep {
  options: Location[];
  selectedId?: string;
}

function getChildren(parentId: string | null, locations: Location[]): Location[] {
  return locations
    .filter((l) => l.is_active && l.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildChainToLocation(locationId: string, locations: Location[]): string[] {
  const chain: string[] = [];
  let current = locations.find((l) => l.id === locationId);

  while (current) {
    chain.unshift(current.id);
    const parentId: string | null = current.parent_id;
    current = parentId ? locations.find((l) => l.id === parentId) : undefined;
  }

  return chain;
}

/**
 * Walks the chain one level at a time, stopping either at a leaf (no more
 * children to pick from — that's the final value) or at the first
 * unselected level (waiting on the user).
 */
function buildSteps(chain: string[], locations: Location[]): { steps: LevelStep[]; leafId: string | null } {
  const steps: LevelStep[] = [];
  let parentId: string | null = null;
  let index = 0;

  while (true) {
    const options = getChildren(parentId, locations);
    if (options.length === 0) {
      return { steps, leafId: parentId };
    }

    const selectedId = chain[index];
    steps.push({ options, selectedId });
    if (!selectedId) {
      return { steps, leafId: null };
    }

    parentId = selectedId;
    index += 1;
  }
}

export function LocationCombobox({
  locations,
  locationTypes = [],
  value,
  onChange,
  disabled,
  label = "Location",
}: LocationComboboxProps) {
  const [chain, setChain] = useState<string[]>(() => (value ? buildChainToLocation(value, locations) : []));

  useEffect(() => {
    if (value === (chain[chain.length - 1] ?? "")) return;
    setChain(value ? buildChainToLocation(value, locations) : []);
    // Only re-sync when the value changes from outside (e.g. a different
    // unit loads); internal selections already keep `chain` in lockstep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, locations]);

  const { steps, leafId } = useMemo(() => buildSteps(chain, locations), [chain, locations]);

  const handleSelect = (levelIndex: number, locationId: string) => {
    const nextChain = locationId ? [...chain.slice(0, levelIndex), locationId] : chain.slice(0, levelIndex);
    setChain(nextChain);
    onChange(buildSteps(nextChain, locations).leafId ?? "");
  };

  if (steps.length === 0) {
    return (
      <div className="flex h-[52px] w-full items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
        No locations available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <LocationLevelSelect
          key={index}
          label={index === 0 ? label : getLocationTypeLabel(step.options[0].type, locationTypes)}
          options={step.options}
          value={step.selectedId ?? ""}
          onChange={(id) => handleSelect(index, id)}
          disabled={disabled}
          allowClear={index === 0}
        />
      ))}
      {leafId === null && steps.length > 0 && (
        <p className="text-xs text-muted-foreground">Select an option at every level to set the location.</p>
      )}
    </div>
  );
}

function LocationLevelSelect({
  label,
  options,
  value,
  onChange,
  disabled,
  allowClear,
}: {
  label: string;
  options: Location[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-[52px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
            <span className="text-[11px] font-medium leading-none text-muted-foreground">{label}</span>
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? selected.name : "Select"}
            </span>
          </div>
          <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  <IconCheck className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                  None
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <IconCheck className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
