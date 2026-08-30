import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MeshBackground } from "@/components/MeshBackground";
import { LoginPage } from "@/pages/LoginPage";
import { PlatformDashboardPage } from "@/pages/PlatformDashboardPage";
import { ResidentialDashboardPage } from "@/pages/ResidentialDashboardPage";
import { ResidentialSignupPage } from "@/pages/ResidentialSignupPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UnitsPage } from "@/pages/UnitsPage";
import { UnitDetailPage } from "@/pages/UnitDetailPage";
import { AddonDetailPage } from "@/pages/AddonDetailPage";
import { ChargeDetailPage } from "@/pages/ChargeDetailPage";
import { useI18n } from "@/i18n/useI18n";
import { isMessageKey } from "@/i18n/messages";
import { useAccess } from "@/state/useAccess";
import { useSession } from "@/state/useSession";
import {
  getCurrentRoute,
  getUnitIdFromHash,
  getAddonIdFromHash,
  getChargeIdFromHash,
  isSettingsRoute,
  navigateTo,
  type RouteType,
} from "@/config/routes";

export default function App() {
  const { t } = useI18n();
  const [currentRoute, setCurrentRoute] = useState<RouteType>(getCurrentRoute);

  // Handle hash changes for routing
  useEffect(() => {
    function onHashChange() {
      setCurrentRoute(getCurrentRoute());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const isSupabaseConfigured = useMemo(
    () =>
      Boolean(
        import.meta.env.VITE_SUPABASE_URL &&
          (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY),
      ),
    [],
  );

  const { session, isLoading: sessionLoading } = useSession({ enabled: isSupabaseConfigured });
  const { access, isLoading: isAccessLoading, error: accessError } = useAccess({
    enabled: isSupabaseConfigured && Boolean(session?.user),
    refreshKey: currentRoute,
  });

  // Supabase not configured
  if (!isSupabaseConfigured) {
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.supabaseNotConfigured.title")}</CardTitle>
              <CardDescription>{t("app.supabaseNotConfigured.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>{t("app.supabaseNotConfigured.instructions")}</div>
              <div>- `VITE_SUPABASE_URL`</div>
              <div>- `VITE_SUPABASE_PUBLISHABLE_KEY`</div>
            </CardContent>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // Session is loading (e.g., on hard refresh)
  if (sessionLoading) {
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.loading.title")}</CardTitle>
              <CardDescription>{t("app.loading.description")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // Signup route (requires being logged in for tenant creation)
  if (currentRoute === "signup") {
    return (
      <AppFrame>
        <ResidentialSignupPage
          onBackToLogin={() => navigateTo("login")}
          onComplete={() => navigateTo("residential")}
        />
      </AppFrame>
    );
  }

  // Not logged in - show login
  if (!session) {
    return (
      <AppFrame>
        <LoginPage onCreateResidential={() => navigateTo("signup")} />
      </AppFrame>
    );
  }

  // Loading access information
  if (isAccessLoading) {
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.loading.title")}</CardTitle>
              <CardDescription>{t("app.loading.description")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // Access error
  if (accessError) {
    const errorMessage = accessError.startsWith("__i18n__:")
      ? (() => {
          const key = accessError.slice("__i18n__:".length);
          return isMessageKey(key) ? t(key) : key;
        })()
      : accessError;
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.accessError.title")}</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // No access
  if (!access) {
    return (
      <AppFrame>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.noAccess.title")}</CardTitle>
              <CardDescription>{t("app.noAccess.description")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // Route based on access type
  if (access.kind === "platform_admin") {
    return (
      <AppFrame>
        <PlatformDashboardPage />
      </AppFrame>
    );
  }

  // Residential access - route to appropriate page
  if (currentRoute === "units") {
    return (
      <AppFrame>
        <UnitsPage residentialId={access.residentialId} role={access.role} />
      </AppFrame>
    );
  }

  if (currentRoute === "unitDetail") {
    const unitId = getUnitIdFromHash();
    if (unitId) {
      return (
        <AppFrame>
          <UnitDetailPage residentialId={access.residentialId} unitId={unitId} role={access.role} />
        </AppFrame>
      );
    }
    navigateTo("units");
  }

  if (currentRoute === "addonDetail") {
    const addonId = getAddonIdFromHash();
    if (addonId) {
      return (
        <AppFrame>
          <AddonDetailPage residentialId={access.residentialId} addonId={addonId} role={access.role} />
        </AppFrame>
      );
    }
    navigateTo("residential");
  }

  if (currentRoute === "chargeDetail") {
    const chargeId = getChargeIdFromHash();
    if (chargeId) {
      return (
        <AppFrame>
          <ChargeDetailPage residentialId={access.residentialId} chargeId={chargeId} role={access.role} />
        </AppFrame>
      );
    }
    navigateTo("residential");
  }

  if (isSettingsRoute(currentRoute)) {
    return (
      <AppFrame>
        <SettingsPage residentialId={access.residentialId} />
      </AppFrame>
    );
  }

  // Default to dashboard
  return (
    <AppFrame>
      <ResidentialDashboardPage residentialId={access.residentialId} role={access.role} />
    </AppFrame>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <MeshBackground />
      <div className="relative">{children}</div>
      <Toaster richColors position="top-right" closeButton expand visibleToasts={5} />
    </div>
  );
}
