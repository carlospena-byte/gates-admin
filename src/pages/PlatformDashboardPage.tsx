import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingStates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppSidebar } from "@/components/AppSidebar";
import { PlatformMetricsRow } from "@/components/dashboard/PlatformMetricsRow";
import { authService, platformMetricsService, residentialService, type ResidentialWithOwner } from "@/services";
import { navigateTo, navigateToPlatformResidentialDetail } from "@/config/routes";
import { useQuery } from "@/hooks";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformDashboardPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residentials, setResidentials] = useState<ResidentialWithOwner[]>([]);
  const { data: metrics } = useQuery(() => platformMetricsService.getPlatformMetrics());

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    residentialService
      .list()
      .then((result) => {
        if (!isMounted) return;
        if (result.success) {
          setResidentials(result.data.slice(0, 5));
          return;
        }
        setError(result.error.message);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <AppSidebar
        userEmail={session?.user?.email}
        onSignOut={() => authService.signOut()}
        showUserMenu
        isPlatformAdmin
      />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t("dashboard.platform.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard.platform.description")}</p>
          </div>

          <PlatformMetricsRow metrics={metrics} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>{t("platformAdmin.residentials.recent.title")}</CardTitle>
                <CardDescription>{t("platformAdmin.residentials.recent.description")}</CardDescription>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigateTo("platformResidentials")}>
                {t("common.viewAll")}
              </Button>
            </CardHeader>
            <CardContent>
              {error ? (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {isLoading ? (
                <TableSkeleton rows={4} columns={3} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("common.owner")}</TableHead>
                      <TableHead className="w-[120px] text-right">{t("dashboard.platform.open")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {residentials.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.profiles?.email ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigateToPlatformResidentialDetail(r.id)}
                          >
                            {t("dashboard.platform.open")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!residentials.length ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          {t("platform.empty")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
