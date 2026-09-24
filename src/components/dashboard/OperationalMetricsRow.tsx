import { SummaryStat } from "@/components/ui/summary-stat";
import { navigateTo } from "@/config/routes";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type { OperationalMetrics } from "@/services";

export function OperationalMetricsRow({ metrics }: { metrics: OperationalMetrics | null }) {
  const { t } = useI18n();
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryStat
        title={t("dashboard.today.payments.title")}
        value={String(metrics.paymentsPendingValidation)}
        detail={t("dashboard.today.payments.detail", { amount: formatCurrency(metrics.pendingAmount) })}
        status={
          metrics.paymentsPendingValidation === 0
            ? t("dashboard.today.payments.ok")
            : t("dashboard.today.payments.pending", { count: metrics.paymentsPendingValidation })
        }
        statusTone="brand"
      />
      <SummaryStat
        title={t("dashboard.today.incidents.title")}
        value={String(metrics.openIncidents)}
        detail={metrics.openIncidents === 0 ? t("dashboard.today.incidents.detailEmpty") : t("dashboard.today.incidents.detailPending")}
        status={metrics.openIncidents === 0 ? t("dashboard.today.incidents.okStatus") : t("dashboard.today.incidents.viewStatus")}
        statusTone="brand"
        className={metrics.openIncidents > 0 ? "cursor-pointer" : undefined}
        onClick={metrics.openIncidents > 0 ? () => navigateTo("incidents") : undefined}
      />
      <SummaryStat
        title={t("dashboard.today.visitors.title")}
        value={String(metrics.visitorsToday)}
        detail={t("dashboard.today.visitors.detail", { count: metrics.visitorsInside })}
        status={t("dashboard.today.visitors.status")}
        statusTone="brand"
        className="cursor-pointer"
        onClick={() => navigateTo("visitors")}
      />
      <SummaryStat
        title={t("dashboard.today.reservations.title")}
        value={String(metrics.reservationsToday)}
        detail={metrics.reservationsToday === 0 ? t("dashboard.today.reservations.detailEmpty") : t("dashboard.today.reservations.detailPending")}
        status={t("dashboard.today.reservations.status")}
        statusTone="brand"
        className="cursor-pointer"
        onClick={() => navigateTo("reservations")}
      />
    </div>
  );
}
