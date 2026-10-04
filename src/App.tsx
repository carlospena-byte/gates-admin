import { useEffect, useMemo, useState } from "react";
import { Toaster } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MeshBackground } from "@/components/MeshBackground";
import { ResidentialTopBar } from "@/components/ResidentialTopBar";
import { authService } from "@/services/auth.service";
import { LoginPage } from "@/pages/LoginPage";
import { PlatformDashboardPage } from "@/pages/PlatformDashboardPage";
import { PlatformResidentialsPage } from "@/pages/PlatformResidentialsPage";
import { PlatformResidentialDetailPage } from "@/pages/PlatformResidentialDetailPage";
import { PlatformPlansPage } from "@/pages/PlatformPlansPage";
import { PlatformProvidersPage } from "@/pages/PlatformProvidersPage";
import { PlatformAmenitiesCatalogPage } from "@/pages/PlatformAmenitiesCatalogPage";
import { PlatformAdminsPage } from "@/pages/PlatformAdminsPage";
import { PlatformAuditLogPage } from "@/pages/PlatformAuditLogPage";
import { PlatformAppSettingsPage } from "@/pages/PlatformAppSettingsPage";
import { ResidentialDashboardPage } from "@/pages/ResidentialDashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UnitsPage } from "@/pages/UnitsPage";
import { ResidentsPage } from "@/pages/ResidentsPage";
import { VisitorsPage } from "@/pages/VisitorsPage";
import { IncidentsPage } from "@/pages/IncidentsPage";
import { AnnouncementsPage } from "@/pages/AnnouncementsPage";
import { BulletinsPage } from "@/pages/BulletinsPage";
import { ReservationsPage } from "@/pages/ReservationsPage";
import { AmenitiesPage } from "@/pages/AmenitiesPage";
import { BillingPage } from "@/pages/BillingPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { UnitDetailPage } from "@/pages/UnitDetailPage";
import { AddonDetailPage } from "@/pages/AddonDetailPage";
import { ChargeDetailPage } from "@/pages/ChargeDetailPage";
import { FastlanePublicPage } from "@/pages/FastlanePublicPage";
import { useI18n } from "@/i18n/useI18n";
import { isMessageKey } from "@/i18n/messages";
import { useAccess } from "@/state/useAccess";
import type { ResidentialRole } from "@/types/database.types";
import { useSession } from "@/state/useSession";
import {
  getCurrentRoute,
  getDefaultRouteForRole,
  getUnitIdFromHash,
  getAddonIdFromHash,
  getChargeIdFromHash,
  getPlatformResidentialIdFromHash,
  isRouteAllowedForRole,
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

  // fastlanePublic must be reachable even with no Supabase session (or, in
  // principle, no session hooks running at all) — the visitor opens this
  // link on their own phone. All hooks above still run unconditionally per
  // the rules of hooks; this just short-circuits the rendering below them.
  const { session, isLoading: sessionLoading } = useSession({
    enabled: isSupabaseConfigured && currentRoute !== "fastlanePublic",
  });
  const { access, isLoading: isAccessLoading, error: accessError } = useAccess({
    enabled: isSupabaseConfigured && currentRoute !== "fastlanePublic" && Boolean(session?.user),
    refreshKey: currentRoute,
  });

  if (currentRoute === "fastlanePublic") {
    return (
      <AppFrame>
        <FastlanePublicPage />
      </AppFrame>
    );
  }

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

  // Not logged in - show login
  if (!session) {
    return (
      <AppFrame>
        <LoginPage />
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
            <CardContent>
              <Button variant="outline" onClick={() => authService.signOut()}>
                {t("common.signOut")}
              </Button>
            </CardContent>
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
            <CardContent>
              <Button variant="outline" onClick={() => authService.signOut()}>
                {t("common.signOut")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppFrame>
    );
  }

  // Route based on access type
  if (access.kind === "platform_admin") {
    if (currentRoute === "platformResidentials") {
      return (
        <AppFrame>
          <PlatformResidentialsPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformResidentialDetail") {
      const residentialId = getPlatformResidentialIdFromHash();
      if (residentialId) {
        return (
          <AppFrame>
            <PlatformResidentialDetailPage residentialId={residentialId} />
          </AppFrame>
        );
      }
      navigateTo("platformResidentials");
    }

    if (currentRoute === "platformPlans") {
      return (
        <AppFrame>
          <PlatformPlansPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformProviders") {
      return (
        <AppFrame>
          <PlatformProvidersPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformAmenitiesCatalog") {
      return (
        <AppFrame>
          <PlatformAmenitiesCatalogPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformAdmins") {
      return (
        <AppFrame>
          <PlatformAdminsPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformAuditLog") {
      return (
        <AppFrame>
          <PlatformAuditLogPage />
        </AppFrame>
      );
    }

    if (currentRoute === "platformAppSettings") {
      return (
        <AppFrame>
          <PlatformAppSettingsPage />
        </AppFrame>
      );
    }

    return (
      <AppFrame>
        <PlatformDashboardPage />
      </AppFrame>
    );
  }

  // Residential access - route to appropriate page

  // Role doesn't have access to the current route - redirect to a route it can see
  if (!isRouteAllowedForRole(currentRoute, access.role)) {
    navigateTo(getDefaultRouteForRole(access.role));
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{t("app.loading.title")}</CardTitle>
              <CardDescription>{t("app.loading.description")}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ResidentialFrame>
    );
  }

  if (currentRoute === "units") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <UnitsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "residents") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <ResidentsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "visitors") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <VisitorsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "incidents") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <IncidentsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "announcements") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <AnnouncementsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "bulletins") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <BulletinsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "reservations") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <ReservationsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "amenities") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <AmenitiesPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "notifications") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <NotificationsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "billing") {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <BillingPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  if (currentRoute === "unitDetail") {
    const unitId = getUnitIdFromHash();
    if (unitId) {
      return (
        <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
          <UnitDetailPage residentialId={access.residentialId} unitId={unitId} role={access.role} />
        </ResidentialFrame>
      );
    }
    navigateTo("units");
  }

  if (currentRoute === "addonDetail") {
    const addonId = getAddonIdFromHash();
    if (addonId) {
      return (
        <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
          <AddonDetailPage residentialId={access.residentialId} addonId={addonId} role={access.role} />
        </ResidentialFrame>
      );
    }
    navigateTo("residential");
  }

  if (currentRoute === "chargeDetail") {
    const chargeId = getChargeIdFromHash();
    if (chargeId) {
      return (
        <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
          <ChargeDetailPage residentialId={access.residentialId} chargeId={chargeId} role={access.role} />
        </ResidentialFrame>
      );
    }
    navigateTo("residential");
  }

  if (isSettingsRoute(currentRoute)) {
    return (
      <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
        <SettingsPage residentialId={access.residentialId} role={access.role} />
      </ResidentialFrame>
    );
  }

  // Default to dashboard
  return (
    <ResidentialFrame residentialId={access.residentialId} role={access.role} userEmail={session.user?.email}>
      <ResidentialDashboardPage residentialId={access.residentialId} role={access.role} />
    </ResidentialFrame>
  );
}

function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <MeshBackground />
      <div className="relative">{children}</div>
      <Toaster
        richColors
        position="top-right"
        closeButton
        expand
        visibleToasts={5}
        toastOptions={{
          classNames: {
            toast: "!rounded-lg !font-sans",
            success: "!border-transparent !bg-gates-success-bg !text-gates-text-brand",
            error: "!border-transparent !bg-gates-error-bg !text-gates-error",
            warning: "!border-transparent !bg-gates-warning-bg !text-gates-warning",
            info: "!border-transparent !bg-gates-lilac !text-gates-text-brand",
          },
        }}
      />
    </div>
  );
}

/** AppFrame plus the header (date, bell, avatar) every residential screen shares. */
function ResidentialFrame({
  residentialId,
  role,
  userEmail,
  children,
}: {
  residentialId: string;
  role: ResidentialRole;
  userEmail?: string | null;
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <ResidentialTopBar residentialId={residentialId} role={role} userEmail={userEmail} />
      {children}
    </AppFrame>
  );
}
