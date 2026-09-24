/**
 * Searchable icon picker for the services catalog — a popover grid over
 * the curated SERVICE_ICON_OPTIONS list. Filters by icon name or by the
 * Spanish keywords attached to each option (e.g. typing "toallas" finds
 * IconBath/IconWashDryHang).
 */

import { useRef, useState } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getServiceIcon, searchServiceIcons, SERVICE_ICON_OPTIONS } from "@/lib/serviceIcons";
import { useI18n } from "@/i18n/useI18n";

interface IconPickerProps {
  value: string | null;
  onChange: (iconName: string) => void;
  disabled?: boolean;
}

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim() ? searchServiceIcons(search, SERVICE_ICON_OPTIONS.length) : SERVICE_ICON_OPTIONS;

  const SelectedIcon = getServiceIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={t("amenities.iconPicker.chooseLabel")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-gates-surface text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
        >
          <SelectedIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      {/* portal={false}: this picker is meant to be used inside a Sheet — see
          the `portal` prop doc in ui/popover.tsx for why that's required
          for the search input to be focusable/typable there. */}
      <PopoverContent
        className="w-72 p-3"
        align="start"
        portal={false}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="relative mb-2">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("amenities.iconPicker.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("amenities.iconPicker.empty")}</p>
        ) : (
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.name}
                type="button"
                title={opt.keywords[0]}
                onClick={() => {
                  onChange(opt.name);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  value === opt.name && "bg-accent text-accent-foreground ring-1 ring-primary",
                )}
              >
                <opt.Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
