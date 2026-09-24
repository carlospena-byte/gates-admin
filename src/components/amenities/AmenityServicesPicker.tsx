/**
 * Picker for the amenity's services (searchable toggle list, modeled on
 * AddAddonSheet) plus a "featured" chip row (max 6, matches the Figma
 * "Servicios destacados: N/6" counter) — clicking a chip's star toggles
 * featured, its "x" deselects the service entirely.
 *
 * Only selects from the existing catalog — creating a new service tag
 * happens in its own Services manager (opened from the residential
 * dashboard), not nested inside this form. Keeping catalog management out
 * of here also avoids stacking two Sheets (this form + a catalog manager)
 * with a Popover nested inside both, which is fragile with Radix's
 * portal/focus-trap interactions.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconSearch, IconStar, IconStarFilled, IconX } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getServiceIcon } from "@/lib/serviceIcons";
import { useI18n } from "@/i18n/useI18n";
import type { AmenityServiceSelection, Service } from "@/types/amenities.types";

const MAX_FEATURED = 6;

interface AmenityServicesPickerProps {
  services: Service[];
  selections: AmenityServiceSelection[];
  onChange: (selections: AmenityServiceSelection[]) => void;
  disabled?: boolean;
}

export function AmenityServicesPicker({ services, selections, onChange, disabled }: AmenityServicesPickerProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");

  const selectionByServiceId = useMemo(
    () => new Map(selections.map((s) => [s.serviceId, s.isFeatured])),
    [selections],
  );
  const featuredCount = selections.filter((s) => s.isFeatured).length;

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services
      .filter((s) => s.is_active)
      .filter((s) => !query || s.name.toLowerCase().includes(query));
  }, [services, search]);

  const toggleSelected = (serviceId: string) => {
    if (selectionByServiceId.has(serviceId)) {
      onChange(selections.filter((s) => s.serviceId !== serviceId));
    } else {
      onChange([...selections, { serviceId, isFeatured: false }]);
    }
  };

  const toggleFeatured = (serviceId: string) => {
    const current = selectionByServiceId.get(serviceId);
    if (current === undefined) return;
    if (!current && featuredCount >= MAX_FEATURED) {
      toast.error(t("amenities.servicesPicker.maxFeatured", { max: MAX_FEATURED }));
      return;
    }
    onChange(selections.map((s) => (s.serviceId === serviceId ? { ...s, isFeatured: !s.isFeatured } : s)));
  };

  const selectedServices = selections
    .map((s) => ({ selection: s, service: services.find((sv) => sv.id === s.serviceId) }))
    .filter((x): x is { selection: AmenityServiceSelection; service: Service } => Boolean(x.service));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">
          {t("amenities.servicesPicker.featuredCount", { count: featuredCount, max: MAX_FEATURED })}
        </p>
        <p className="text-xs text-muted-foreground">{t("amenities.servicesPicker.hint")}</p>
      </div>

      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedServices.map(({ selection, service }) => {
            const Icon = getServiceIcon(service.icon);
            return (
              <span
                key={service.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm",
                  selection.isFeatured ? "border-amber-300 bg-amber-50 text-amber-700" : "bg-muted",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <button
                  type="button"
                  aria-label={
                    selection.isFeatured
                      ? t("amenities.servicesPicker.unfeatureLabel")
                      : t("amenities.servicesPicker.featureLabel")
                  }
                  disabled={disabled}
                  onClick={() => toggleFeatured(service.id)}
                >
                  {selection.isFeatured ? (
                    <IconStarFilled className="h-3.5 w-3.5" />
                  ) : (
                    <IconStar className="h-3.5 w-3.5" />
                  )}
                </button>
                {service.name}
                <button
                  type="button"
                  aria-label={t("amenities.servicesPicker.removeLabel", { name: service.name })}
                  disabled={disabled}
                  onClick={() => toggleSelected(service.id)}
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("amenities.servicesPicker.searchPlaceholder")}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      <div className="space-y-1">
        {filteredServices.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("amenities.servicesPicker.empty")}</p>
        ) : (
          filteredServices.map((service) => {
            const Icon = getServiceIcon(service.icon);
            return (
              <div key={service.id} className="flex items-center justify-between py-1.5">
                <span className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {service.name}
                </span>
                <Switch
                  checked={selectionByServiceId.has(service.id)}
                  onCheckedChange={() => toggleSelected(service.id)}
                  disabled={disabled}
                  aria-label={t("amenities.servicesPicker.selectLabel", { name: service.name })}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
