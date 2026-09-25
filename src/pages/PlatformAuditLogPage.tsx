import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { ActivityLogTable } from "@/components/activityLog/ActivityLogTable";
import { usePlatformAuditLogData } from "@/hooks/usePlatformAuditLogData";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformAuditLogPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const { logs, isLoading } = usePlatformAuditLogData();

  return (
    <div className="min-h-screen">
      <AppSidebar
        userEmail={session?.user?.email}
        onSignOut={() => authService.signOut()}
        showUserMenu
        isPlatformAdmin
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.auditLog.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.auditLog.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("activityLog.title")}</CardTitle>
              <CardDescription>{t("activityLog.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityLogTable logs={logs} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
