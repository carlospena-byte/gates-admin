import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitTypeSettingsPanel } from "@/components/UnitTypeManager";
import { LocationTypeSettingsPanel } from "@/components/LocationTypeManager";
import { AddonTypeSettingsPanel } from "@/components/AddonTypeManager";
import { LocationSettingsPanel } from "@/components/LocationManager";
import { AddonSettingsPanel } from "@/components/AddonManager";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { cn } from "@/lib/utils";
import { getCurrentRoute, ROUTES, type RouteType } from "@/config/routes";

const SECTIONS = [
  {
    route: "settingsUnitTypes" as RouteType,
    label: "Unit Types",
    description: "Define the categories of units available (Apartment, House, Studio...).",
  },
  {
    route: "settingsLocationTypes" as RouteType,
    label: "Location Types",
    description: "Define the types of locations available (Tower, Floor, Polygon...).",
  },
  {
    route: "settingsAddonTypes" as RouteType,
    label: "Addon Types",
    description: "Define categories for addons (Parking, Storage, Gym...).",
  },
  {
    route: "settingsLocations" as RouteType,
    label: "Locations",
    description: "Create and manage hierarchical locations.",
  },
  {
    route: "settingsAddons" as RouteType,
    label: "Addons",
    description: "Create and manage addons available for units.",
  },
];

function SettingsSectionPanel({ route, residentialId }: { route: RouteType; residentialId: string }) {
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
    default:
      return null;
  }
}

export function SettingsPage({ residentialId }: { residentialId: string }) {
  const { session } = useSession();
  const currentRoute = getCurrentRoute();
  const active = SECTIONS.find((section) => section.route === currentRoute) ?? SECTIONS[0];

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
          <div>
            <div className="text-2xl font-bold tracking-tight">App Settings</div>
            <div className="text-sm text-muted-foreground">Manage your residential's configuration.</div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <nav className="space-y-1">
              {SECTIONS.map((section, index) => {
                const isActive = section.route === active.route;
                return (
                  <a
                    key={section.route}
                    href={ROUTES[section.route].hash}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {index + 1}
                    </span>
                    {section.label}
                  </a>
                );
              })}
            </nav>

            <Card>
              <CardHeader>
                <CardTitle>{active.label}</CardTitle>
                <CardDescription>{active.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <SettingsSectionPanel route={active.route} residentialId={residentialId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
