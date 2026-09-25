import { SummaryStat } from "@/components/ui/summary-stat";
import { navigateTo } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import type { PlatformMetrics } from "@/services";

export function PlatformMetricsRow({ metrics }: { metrics: PlatformMetrics | null }) {
  const { t } = useI18n();
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <SummaryStat
        title={t("platformAdmin.metrics.residentials.title")}
        value={String(metrics.totalResidentials)}
        detail={t("platformAdmin.metrics.residentials.detail", { count: metrics.activeResidentials })}
        statusTone="brand"
        className="cursor-pointer"
        onClick={() => navigateTo("platformResidentials")}
      />
      <SummaryStat
        title={t("platformAdmin.metrics.units.title")}
        value={String(metrics.totalUnits)}
        statusTone="brand"
      />
      <SummaryStat
        title={t("platformAdmin.metrics.residents.title")}
        value={String(metrics.totalResidents)}
        statusTone="brand"
      />
      <SummaryStat
        title={t("platformAdmin.metrics.incidents.title")}
        value={String(metrics.openIncidents)}
        status={metrics.openIncidents === 0 ? t("dashboard.today.incidents.okStatus") : undefined}
        statusTone={metrics.openIncidents === 0 ? "success" : "warning"}
      />
      <SummaryStat
        title={t("platformAdmin.metrics.payments.title")}
        value={String(metrics.paymentsPendingValidation)}
        statusTone={metrics.paymentsPendingValidation === 0 ? "success" : "warning"}
      />
    </div>
  );
}
