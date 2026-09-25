import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalServicesPanel } from "@/components/admin/GlobalServicesPanel";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformAmenitiesCatalogPage() {
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
        <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.amenitiesCatalog.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.amenitiesCatalog.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.amenitiesCatalog.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.amenitiesCatalog.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalServicesPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
