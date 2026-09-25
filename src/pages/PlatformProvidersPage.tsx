import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalProvidersPanel } from "@/components/admin/GlobalProvidersPanel";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformProvidersPage() {
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
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.providers.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.providers.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.providers.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.providers.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalProvidersPanel />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
