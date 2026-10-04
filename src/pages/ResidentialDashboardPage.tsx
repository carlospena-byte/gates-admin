import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { AppSidebar } from "@/components/AppSidebar";
import { SummaryStat } from "@/components/ui/summary-stat";
import { ActivityLogManager } from "@/components/ActivityLogManager";
import { authService, dashboardMetricsService } from "@/services";
import { useQuery } from "@/hooks";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import { navigateTo } from "@/config/routes";
import { OperationalMetricsRow } from "@/components/dashboard/OperationalMetricsRow";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { TodayInbox } from "@/components/dashboard/TodayInbox";
import { requestCreate } from "@/lib/createIntent";
import { useI18n } from "@/i18n/useI18n";
import type { ResidentialRole } from "@/types/database.types";

/**
 * Home = "Today": live metrics, then the inbox of everything that needs the
 * admin with the action on the row. Structure (units, locations, add-ons,
 * charges, users) lives in Settings; amenities have their own page.
 */
export function ResidentialDashboardPage({
  residentialId,
  role,
}: {
  residentialId: string;
  role: ResidentialRole;
}) {
  const { t } = useI18n();
  const { session, isLoading: sessionLoading } = useSession();
  const canManage = canManageResidential(role);
  const [activityLogOpen, setActivityLogOpen] = useState(false);

  const isQueryEnabled = Boolean(residentialId) && !sessionLoading && Boolean(session);

  const { data: metrics, refetch: refetchMetrics } = useQuery(
    () => dashboardMetricsService.getOperationalMetrics(residentialId),
    { enabled: isQueryEnabled },
  );

  useLiveRefresh(isQueryEnabled ? residentialId : undefined, ["visitors", "incidents", "amenity_bookings", "unit_rental_payments"], () => {
    void refetchMetrics();
  });

  const unassignedUnits = Math.max(0, (metrics?.activeProperties ?? 0) - (metrics?.activeResidents ?? 0));

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          <div>
            <h1 className="text-[32px] font-medium leading-[40px] tracking-[-0.8px] text-gates-text-primary">
              {t("dashboard.hero.title")}
            </h1>
            <p className="text-base text-gates-text-secondary">{t("dashboard.hero.subtitle")}</p>
          </div>

          <OperationalMetricsRow metrics={metrics ?? null} />

          <TodayInbox residentialId={residentialId} role={role} currentUserId={session?.user?.id} />

          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <Card className="flex flex-col gap-5 p-4 sm:p-6">
              <CardTitle>{t("dashboard.yourResidential.title")}</CardTitle>
              <div className="grid grid-cols-2 gap-4">
                <SummaryStat
                  title={t("dashboard.yourResidential.units")}
                  value={String(metrics?.activeProperties ?? 0)}
                  detail={t("dashboard.yourResidential.unitsDetail")}
                />
                <SummaryStat
                  title={t("dashboard.yourResidential.residents")}
                  value={String(metrics?.activeResidents ?? 0)}
                  detail={t("dashboard.yourResidential.residentsDetail")}
                />
              </div>
              {unassignedUnits > 0 && (
                <p className="text-sm text-gates-text-secondary">
                  {t("dashboard.attention.next.pendingSubtitle", { count: unassignedUnits })}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => navigateTo("units")}>
                  {t("dashboard.yourResidential.viewUnits")}
                </Button>
                {canManage && (
                  <Button variant="secondary" onClick={() => requestCreate("unit")}>
                    + {t("dashboard.residential.addUnit")}
                  </Button>
                )}
              </div>
            </Card>

            <RecentActivityCard residentialId={residentialId} onViewAll={() => setActivityLogOpen(true)} />
          </div>
        </div>
      </div>

      <ActivityLogManager open={activityLogOpen} onOpenChange={setActivityLogOpen} residentialId={residentialId} />
    </div>
  );
}
