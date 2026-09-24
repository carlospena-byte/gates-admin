import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingStates";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AppSidebar } from "@/components/AppSidebar";
import { GlobalServicesPanel } from "@/components/admin/GlobalServicesPanel";
import { authService, residentialService, type ResidentialWithOwner } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformDashboardPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [residentials, setResidentials] = useState<ResidentialWithOwner[]>([]);
  const [selectedResidentialId, setSelectedResidentialId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    residentialService
      .list()
      .then((result) => {
        if (!isMounted) return;
        if (result.success) {
          setResidentials(result.data);
          if (!selectedResidentialId && result.data.length) {
            setSelectedResidentialId(result.data[0].id);
          }
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
  }, [selectedResidentialId]);

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} onSignOut={() => authService.signOut()} showUserMenu />
      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.platform.title")}</CardTitle>
              <CardDescription>{t("dashboard.platform.description")}</CardDescription>
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
                          <Button size="sm" variant="secondary" onClick={() => setSelectedResidentialId(r.id)}>
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

          {selectedResidentialId ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.platform.selectedResidential")}</CardTitle>
                <CardDescription>{selectedResidentialId}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.platform.globalServices.title")}</CardTitle>
              <CardDescription>{t("dashboard.platform.globalServices.description")}</CardDescription>
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
