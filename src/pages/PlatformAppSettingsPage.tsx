import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { MaintenancePanel } from "@/components/admin/MaintenancePanel";
import { AppVersionsPanel } from "@/components/admin/AppVersionsPanel";
import { MassPushPanel } from "@/components/admin/MassPushPanel";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformAppSettingsPage() {
  const { t } = useI18n();
  const { session } = useSession();

  return (
    <div className="min-h-screen">
      <AppSidebar
        userEmail={session?.user?.email}
        onSignOut={() => authService.signOut()}
        showUserMenu
        isPlatformAdmin
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.appSettings.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.appSettings.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.appSettings.maintenance.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.appSettings.maintenance.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenancePanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.appSettings.versions.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.appSettings.versions.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AppVersionsPanel />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.appSettings.push.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.appSettings.push.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MassPushPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
