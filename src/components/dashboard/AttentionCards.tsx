import { Button } from "@/components/ui/button";
import { navigateTo } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import type { OperationalMetrics } from "@/services";

export function AttentionCards({
  metrics,
  unassignedUnits,
  onViewActivity,
}: {
  metrics: OperationalMetrics | null;
  unassignedUnits: number;
  onViewActivity: () => void;
}) {
  const { t } = useI18n();
  if (!metrics) return null;

  const isAllClear = metrics.paymentsPendingValidation === 0 && metrics.openIncidents === 0;
  const isAllConnected = unassignedUnits <= 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-4 rounded-gates-lg bg-gates-accent p-6">
        <p className="text-xs font-medium text-gates-text-brand">{t("dashboard.attention.status.eyebrow")}</p>
        <p className="text-2xl font-semibold tracking-tight text-gates-text-primary">
          {isAllClear ? t("dashboard.attention.status.okTitle") : t("dashboard.attention.status.pendingTitle")}
        </p>
        <p className="text-sm text-gates-text-primary">
          {isAllClear
            ? t("dashboard.attention.status.okSubtitle")
            : t("dashboard.attention.status.pendingSubtitle", {
                payments: metrics.paymentsPendingValidation,
                incidents: metrics.openIncidents,
              })}
        </p>
        <div className="flex items-center gap-4">
          <p className="flex-1 text-sm text-gates-text-brand">
            {isAllClear ? t("dashboard.attention.status.okFooter") : t("dashboard.attention.status.pendingFooter")}
          </p>
          <Button variant="secondary" onClick={onViewActivity}>
            {t("dashboard.attention.status.action")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-gates-lg bg-gates-warm p-6">
        <p className="text-xs font-medium text-gates-warning">{t("dashboard.attention.next.eyebrow")}</p>
        <p className="text-xl font-semibold text-gates-text-primary">
          {isAllConnected ? t("dashboard.attention.next.okTitle") : t("dashboard.attention.next.pendingTitle")}
        </p>
        <p className="text-sm text-gates-text-primary">
          {isAllConnected
            ? t("dashboard.attention.next.okSubtitle")
            : t("dashboard.attention.next.pendingSubtitle", { count: unassignedUnits })}
        </p>
        <button
          type="button"
          className="text-left text-sm font-semibold text-gates-text-brand"
          onClick={() => navigateTo("units")}
        >
          {t("dashboard.attention.next.action")}
        </button>
      </div>
    </div>
  );
}
