import { AppSidebar } from "@/components/AppSidebar";
import { UnitTypeSettingsPanel } from "@/components/UnitTypeManager";
import { LocationTypeSettingsPanel } from "@/components/LocationTypeManager";
import { AddonTypeSettingsPanel } from "@/components/AddonTypeManager";
import { IncidentTypeSettingsPanel } from "@/components/IncidentTypeManager";
import { LocationSettingsPanel } from "@/components/LocationManager";
import { AddonSettingsPanel } from "@/components/AddonManager";
import { UserRoleSettingsPanel } from "@/components/settings/UserRoleManager";
import { authService, residentialService } from "@/services";
import { useQuery } from "@/hooks";
import { useSession } from "@/state/useSession";
import { cn } from "@/lib/utils";
import { getCurrentRoute, ROUTES, type RouteType } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import type { ResidentialRole } from "@/types/database.types";

const SECTIONS = [
  {
    route: "settingsUnitTypes" as RouteType,
    labelKey: "settings.sections.unitTypes.label" as MessageKey,
    descriptionKey: "settings.sections.unitTypes.description" as MessageKey,
  },
  {
    route: "settingsLocations" as RouteType,
    labelKey: "settings.sections.locations.label" as MessageKey,
    descriptionKey: "settings.sections.locations.description" as MessageKey,
  },
  {
    route: "settingsAddons" as RouteType,
    labelKey: "settings.sections.addons.label" as MessageKey,
    descriptionKey: "settings.sections.addons.description" as MessageKey,
  },
  {
    route: "settingsIncidentTypes" as RouteType,
    labelKey: "settings.sections.incidentTypes.label" as MessageKey,
    descriptionKey: "settings.sections.incidentTypes.description" as MessageKey,
  },
  {
    route: "settingsUsers" as RouteType,
    labelKey: "common.users" as MessageKey,
    descriptionKey: "settings.sections.users.description" as MessageKey,
  },
  // Reachable by direct link only; not part of the left-hand category nav.
  {
    route: "settingsLocationTypes" as RouteType,
    labelKey: "settings.sections.locationTypes.label" as MessageKey,
    descriptionKey: "settings.sections.locationTypes.description" as MessageKey,
  },
  {
    route: "settingsAddonTypes" as RouteType,
    labelKey: "settings.sections.addonTypes.label" as MessageKey,
    descriptionKey: "settings.sections.addonTypes.description" as MessageKey,
  },
];

const NAV_SECTIONS = SECTIONS.filter(
  (section) => section.route !== "settingsLocationTypes" && section.route !== "settingsAddonTypes",
);

function SettingsSectionPanel({
  route,
  residentialId,
  role,
}: {
  route: RouteType;
  residentialId: string;
  role: ResidentialRole;
}) {
  switch (route) {
    case "settingsUnitTypes":
      return <UnitTypeSettingsPanel residentialId={residentialId} />;
    case "settingsLocationTypes":
      return <LocationTypeSettingsPanel residentialId={residentialId} />;
    case "settingsAddonTypes":
      return <AddonTypeSettingsPanel residentialId={residentialId} />;
    case "settingsLocations":
      return <LocationSettingsPanel residentialId={residentialId} />;
    case "settingsAddons":
      return <AddonSettingsPanel residentialId={residentialId} />;
    case "settingsIncidentTypes":
      return <IncidentTypeSettingsPanel residentialId={residentialId} />;
    case "settingsUsers":
      return <UserRoleSettingsPanel residentialId={residentialId} currentRole={role} />;
    default:
      return null;
  }
}

export function SettingsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const currentRoute = getCurrentRoute();
  const active = SECTIONS.find((section) => section.route === currentRoute) ?? SECTIONS[0];

  const { data: residential } = useQuery(() => residentialService.getById(residentialId));

  return (
    <div className="min-h-screen bg-gates-canvas">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          {residential?.name && (
            <p className="text-xs font-medium uppercase tracking-tight text-gates-text-brand">
              {residential.name} / {t("settings.title")}
            </p>
          )}

          <div>
            <h1 className="text-[32px] font-medium leading-[40px] tracking-[-0.8px] text-gates-text-primary">
              {t("settings.pageTitle")}
            </h1>
            <p className="text-base text-gates-text-secondary">{t("settings.subtitle")}</p>
          </div>

          <div className="flex items-start gap-6">
            <nav className="flex w-52 shrink-0 flex-col gap-1">
              <p className="px-4 pb-1 text-xs font-medium uppercase tracking-tight text-gates-text-secondary">
                {t("settings.category.residential")}
              </p>
              {NAV_SECTIONS.map((section) => {
                const isActive = section.route === active.route;
                return (
                  <a
                    key={section.route}
                    href={ROUTES[section.route].hash}
                    className={cn(
                      "flex h-12 items-center rounded-full px-4 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-gates-accent text-gates-text-brand"
                        : "text-gates-text-brand hover:bg-gates-subtle",
                    )}
                  >
                    {t(section.labelKey)}
                  </a>
                );
              })}
            </nav>

            <div className="flex-1 rounded-gates-lg bg-gates-surface p-6 shadow-gates-card">
              <div className="mb-6 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold tracking-tight text-gates-text-primary">{t(active.labelKey)}</p>
                  <p className="text-sm text-gates-text-secondary">{t(active.descriptionKey)}</p>
                </div>
              </div>
              <SettingsSectionPanel route={active.route} residentialId={residentialId} role={role} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
