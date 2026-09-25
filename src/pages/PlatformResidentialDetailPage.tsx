import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { IconArrowLeft } from "@tabler/icons-react";

import { AppSidebar } from "@/components/AppSidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SummaryStat } from "@/components/ui/summary-stat";
import { Spinner } from "@/components/LoadingStates";
import { navigateTo } from "@/config/routes";
import {
  authService,
  dashboardMetricsService,
  platformPlanService,
  residentialService,
  type OperationalMetrics,
  type ResidentialWithOwner,
} from "@/services";
import { computeMonthlyPrice } from "@/lib/planPricing";
import { formatCurrency } from "@/lib/utils";
import type { PlatformPlan } from "@/types/database.types";
import { useSession } from "@/state/useSession";
import { useI18n } from "@/i18n/useI18n";

const NO_PLAN = "none";

export function PlatformResidentialDetailPage({ residentialId }: { residentialId: string }) {
  const { t } = useI18n();
  const { session } = useSession();
  const [residential, setResidential] = useState<ResidentialWithOwner | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [residentialResult, plansResult, metricsResult] = await Promise.all([
      residentialService.getById(residentialId),
      platformPlanService.list(),
      dashboardMetricsService.getOperationalMetrics(residentialId),
    ]);

    if (residentialResult.success) {
      setResidential(residentialResult.data);
    } else {
      setError(residentialResult.error.message);
    }
    if (plansResult.success) setPlans(plansResult.data);
    if (metricsResult.success) setMetrics(metricsResult.data);

    setIsLoading(false);
  }, [residentialId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleActive = async () => {
    if (!residential) return;
    setIsSubmitting(true);
    const result = await residentialService.update(residential.id, { is_active: !residential.is_active });
    setIsSubmitting(false);

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

  const handlePlanChange = async (value: string) => {
    if (!residential) return;
    setIsSubmitting(true);
    const result = await residentialService.update(residential.id, {
      plan_id: value === NO_PLAN ? null : value,
    });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    toast.success(t("platformAdmin.residentials.planUpdated"));
    await load();
  };

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
          <Button variant="ghost" size="sm" onClick={() => navigateTo("platformResidentials")}>
            <IconArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : residential ? (
            <>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{residential.name}</h1>
                <p className="text-sm text-muted-foreground">{residential.profiles?.email ?? "—"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <SummaryStat title={t("platformAdmin.metrics.units.title")} value={String(metrics?.activeProperties ?? "—")} />
                <SummaryStat title={t("platformAdmin.metrics.residents.title")} value={String(metrics?.activeResidents ?? "—")} />
                <SummaryStat title={t("platformAdmin.metrics.incidents.title")} value={String(metrics?.openIncidents ?? "—")} />
                <SummaryStat title={t("platformAdmin.metrics.payments.title")} value={String(metrics?.paymentsPendingValidation ?? "—")} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t("platformAdmin.residentials.detail.cardTitle")}</CardTitle>
                  <CardDescription>{t("platformAdmin.residentials.detail.cardDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("common.active")}</p>
                      <p className="text-xs text-muted-foreground">
                        {residential.is_active
                          ? t("platformAdmin.residentials.activeDescription")
                          : t("platformAdmin.residentials.suspendedDescription")}
                      </p>
                    </div>
                    <Switch
                      checked={residential.is_active}
                      disabled={isSubmitting}
                      onCheckedChange={handleToggleActive}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("platformAdmin.residentials.plan")}
                    </label>
                    <Select
                      value={residential.plan_id ?? NO_PLAN}
                      onValueChange={handlePlanChange}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PLAN}>{t("common.none")}</SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id} disabled={!plan.is_active}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {residential.platform_plans && metrics ? (
                      <p className="text-xs text-muted-foreground">
                        {t("platformAdmin.residentials.estimatedMonthly", {
                          price: formatCurrency(
                            computeMonthlyPrice(
                              plans.find((plan) => plan.id === residential.plan_id) ?? {
                                base_price: 0,
                                price_per_unit: 0,
                                min_monthly_price: 0,
                              },
                              metrics.activeProperties,
                            ),
                          ),
                        })}
                      </p>
                    ) : null}
                  </div>

                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">{t("platformAdmin.residentials.address")}</dt>
                      <dd className="text-foreground">{residential.address ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("platformAdmin.residentials.createdAt")}</dt>
                      <dd className="text-foreground">
                        {new Date(residential.created_at).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
