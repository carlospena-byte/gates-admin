import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { PlatformPlanManager } from "@/components/admin/PlatformPlanManager";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformPlansPage() {
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
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.plans.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.plans.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.plans.cardTitle")}</CardTitle>
              <CardDescription>{t("platformAdmin.plans.cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <PlatformPlanManager />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
