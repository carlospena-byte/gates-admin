import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppSidebar } from "@/components/AppSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { navigateToPlatformResidentialDetail } from "@/config/routes";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { authService, residentialService, type ResidentialWithOwner } from "@/services";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

export function PlatformResidentialsPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const [residentials, setResidentials] = useState<ResidentialWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await residentialService.list();
    if (result.success) {
      setResidentials(result.data);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleActive = async (residential: ResidentialWithOwner) => {
    setTogglingId(residential.id);
    const result = await residentialService.update(residential.id, { is_active: !residential.is_active });
    setTogglingId(null);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(
      residential.is_active
        ? t("platformAdmin.residentials.suspended", { name: residential.name })
        : t("platformAdmin.residentials.activated", { name: residential.name }),
    );
    await load();
  };

  const {
    paginatedData: paginatedResidentials,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData<ResidentialWithOwner, "name">({
    data: residentials,
    defaultSortField: "name",
    itemsPerPage: 15,
  });

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
            <h1 className="text-2xl font-semibold text-foreground">{t("platformAdmin.residentials.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("platformAdmin.residentials.description")}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("platformAdmin.residentials.cardTitle")}</CardTitle>
              <CardDescription>
                {t("platformAdmin.residentials.cardDescription", { count: totalItems })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {isLoading ? (
                <TableSkeleton rows={6} columns={5} />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("common.owner")}</TableHead>
                        <TableHead>{t("platformAdmin.residentials.plan")}</TableHead>
                        <TableHead className="w-[110px]">{t("common.active")}</TableHead>
                        <TableHead className="w-[120px] text-right">{t("dashboard.platform.open")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResidentials.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.profiles?.email ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.platform_plans?.name ?? r.plan_type ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={r.is_active}
                              disabled={togglingId === r.id}
                              onCheckedChange={() => handleToggleActive(r)}
                              aria-label={
                                r.is_active
                                  ? t("platformAdmin.residentials.setSuspended", { name: r.name })
                                  : t("platformAdmin.residentials.setActive", { name: r.name })
                              }
                            />
                          </TableCell>
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
                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                            {t("platform.empty")}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
