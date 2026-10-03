import { useEffect, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  isRouteAllowedForRole,
  navigateTo,
  navigateToUnitDetail,
  ROUTES,
  type RouteType,
} from "@/config/routes";
import { getQuickActionsForRole } from "@/config/quickActions";
import { NAV_SECTIONS } from "@/config/sections";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/useI18n";
import { requestCreate } from "@/lib/createIntent";
import { unitResidentService, unitService, visitorService } from "@/services";
import type { ResidentialRole } from "@/types/database.types";

interface EntityHit {
  id: string;
  label: string;
  hint: string;
}

interface Entities {
  units: EntityHit[];
  residents: (EntityHit & { unitId: string })[];
  visitors: EntityHit[];
}

const SETTINGS_LINKS: { route: RouteType; labelKey: MessageKey }[] = [
  { route: "settingsUnitTypes", labelKey: "settings.sections.unitTypes.label" },
  { route: "settingsLocations", labelKey: "settings.sections.locations.label" },
  { route: "settingsAddons", labelKey: "settings.sections.addons.label" },
  { route: "settingsCharges", labelKey: "settings.sections.charges.label" },
  { route: "settingsIncidentTypes", labelKey: "settings.sections.incidentTypes.label" },
  { route: "settingsUsers", labelKey: "common.users" },
];

/** ⌘K / Ctrl+K: jump to any screen, run a create action, or find a unit, resident or visitor. */
export function CommandPalette({
  residentialId,
  role,
  open,
  onOpenChange,
}: {
  residentialId: string;
  role?: ResidentialRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [entities, setEntities] = useState<Entities | null>(null);
  const canSeeSettings = !role || role === "owner" || role === "admin";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const [units, residents, visitors] = await Promise.all([
        !role || isRouteAllowedForRole("units", role) ? unitService.listByResidential(residentialId) : null,
        !role || isRouteAllowedForRole("residents", role)
          ? unitResidentService.listByResidentialWithStatus(residentialId)
          : null,
        !role || isRouteAllowedForRole("visitors", role) ? visitorService.list(residentialId) : null,
      ]);
      if (cancelled) return;
      setEntities({
        units: units?.success ? units.data.map((u) => ({ id: u.id, label: u.name, hint: "" })) : [],
        residents: residents?.success
          ? residents.data.map((r) => ({
              id: r.id,
              unitId: r.unit_id,
              label: r.full_name,
              hint: [r.units?.name, r.email].filter(Boolean).join(" · "),
            }))
          : [],
        visitors: visitors?.success
          ? visitors.data.slice(0, 200).map((v) => ({
              id: v.id,
              label: v.name ?? v.plate ?? v.phone ?? "—",
              hint: [v.plate, v.phone].filter(Boolean).join(" · "),
            }))
          : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, residentialId, role]);

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const pages = NAV_SECTIONS.flatMap((section) => section.routes).filter(
    (entry) => !role || isRouteAllowedForRole(entry.route, role),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">{t("palette.title")}</DialogTitle>
        <Command className="rounded-none">
          <CommandInput placeholder={t("palette.placeholder")} />
          <CommandList className="max-h-[420px]">
            <CommandEmpty>{t("palette.empty")}</CommandEmpty>

            <CommandGroup heading={t("palette.group.create")}>
              {getQuickActionsForRole(role).map((action) => (
                <CommandItem
                  key={action.intent}
                  value={`${t("quick.create")} ${t(action.labelKey)}`}
                  onSelect={() => run(() => requestCreate(action.intent))}
                >
                  + {t(action.labelKey)}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading={t("palette.group.go")}>
              {pages.map((entry) => (
                <CommandItem
                  key={entry.route}
                  value={`${t("palette.group.go")} ${t(entry.labelKey)}`}
                  onSelect={() => run(() => navigateTo(entry.route))}
                >
                  {t(entry.labelKey)}
                </CommandItem>
              ))}
              {canSeeSettings &&
                SETTINGS_LINKS.map((entry) => (
                  <CommandItem
                    key={entry.route}
                    value={`${t("common.settings")} ${t(entry.labelKey)}`}
                    onSelect={() => run(() => (window.location.hash = ROUTES[entry.route].hash))}
                  >
                    {t("common.settings")} · {t(entry.labelKey)}
                  </CommandItem>
                ))}
            </CommandGroup>

            {entities && entities.units.length > 0 && (
              <CommandGroup heading={t("appSidebar.nav.units")}>
                {entities.units.map((unit) => (
                  <CommandItem
                    key={unit.id}
                    value={`unit ${unit.label} ${unit.id}`}
                    onSelect={() => run(() => navigateToUnitDetail(unit.id))}
                  >
                    {unit.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {entities && entities.residents.length > 0 && (
              <CommandGroup heading={t("appSidebar.nav.residents")}>
                {entities.residents.map((resident) => (
                  <CommandItem
                    key={resident.id}
                    value={`resident ${resident.label} ${resident.hint} ${resident.id}`}
                    onSelect={() => run(() => navigateToUnitDetail(resident.unitId))}
                  >
                    <span className="flex-1 truncate">{resident.label}</span>
                    <span className="ml-3 truncate text-xs text-muted-foreground">{resident.hint}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {entities && entities.visitors.length > 0 && (
              <CommandGroup heading={t("appSidebar.nav.visitors")}>
                {entities.visitors.map((visitor) => (
                  <CommandItem
                    key={visitor.id}
                    value={`visitor ${visitor.label} ${visitor.hint} ${visitor.id}`}
                    onSelect={() => run(() => navigateTo("visitors"))}
                  >
                    <span className="flex-1 truncate">{visitor.label}</span>
                    <span className="ml-3 truncate text-xs text-muted-foreground">{visitor.hint}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
