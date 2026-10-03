import { useI18n } from "@/i18n/useI18n";
import { SummaryStat } from "@/components/ui/summary-stat";
import { formatCurrency } from "@/lib/utils";
import type { BillingSummary } from "@/types/billing.types";

function monthLabel(period: string, locale: string): string {
  return new Date(`${period}T00:00:00`).toLocaleDateString(locale, {
    month: "short",
  });
}

export function BillingKpis({ summary }: { summary: BillingSummary | null }) {
  const { t, locale } = useI18n();
  if (!summary) return null;

  const rate =
    summary.billed > 0
      ? Math.round((summary.collected / summary.billed) * 100)
      : 0;
  const maxTrend = Math.max(1, ...summary.trend.map((point) => point.billed));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("billing.kpi.sectionCollection")}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            title={t("billing.kpi.billed")}
            value={formatCurrency(summary.billed)}
            detail={t("billing.kpi.billedDetail", {
              count: summary.installments,
            })}
          />
          <SummaryStat
            title={t("billing.kpi.collected")}
            value={formatCurrency(summary.collected)}
            detail={t("billing.kpi.collectedDetail", {
              rate,
              paid: summary.paid_count,
              total: summary.installments,
            })}
            status={`${rate}%`}
            statusTone={
              rate >= 80 ? "success" : rate >= 50 ? "warning" : "error"
            }
          />
          <SummaryStat
            title={t("billing.kpi.pending")}
            value={formatCurrency(summary.pending_current)}
            detail={t("billing.kpi.pendingDetail")}
          />
          <SummaryStat
            title={t("billing.kpi.overdue")}
            value={formatCurrency(summary.overdue_balance)}
            detail={t("billing.kpi.overdueDetail", {
              installments: summary.overdue_installments,
              fees: formatCurrency(summary.overdue_late_fees),
            })}
            status={
              summary.overdue_balance > 0
                ? t("billing.kpi.overdueStatus")
                : undefined
            }
            statusTone="error"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("billing.kpi.sectionArrears")}
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat
            title={t("billing.kpi.overdueUnits")}
            value={String(summary.overdue_units)}
            detail={t("billing.kpi.overdueUnitsDetail")}
          />
          <SummaryStat
            title={t("billing.kpi.multiple")}
            value={String(summary.units_multiple)}
            detail={t("billing.kpi.multipleDetail")}
            status={
              summary.units_multiple > 0
                ? t("billing.kpi.multipleStatus")
                : undefined
            }
            statusTone="warning"
          />
          <div className="flex flex-col gap-4 rounded-gates-lg border border-border bg-gates-surface p-5 sm:col-span-2">
            <p className="text-sm font-medium text-muted-foreground">
              {t("billing.kpi.trend")}
            </p>
            <div
              className="flex h-24 items-end gap-3"
              role="img"
              aria-label={t("billing.kpi.trend")}
            >
              {summary.trend.map((point) => (
                <div
                  key={point.period}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-16 w-full items-end gap-0.5 border-b border-border">
                    <div
                      className="w-1/2 min-h-[2px] rounded-t bg-primary/25"
                      style={{ height: `${(point.billed / maxTrend) * 100}%` }}
                      title={`${t("billing.kpi.billed")}: ${formatCurrency(point.billed)}`}
                    />
                    <div
                      className="w-1/2 min-h-[2px] rounded-t bg-primary"
                      style={{
                        height: `${(point.collected / maxTrend) * 100}%`,
                      }}
                      title={`${t("billing.kpi.collected")}: ${formatCurrency(point.collected)}`}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {monthLabel(point.period, locale)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary/25" />{" "}
                {t("billing.kpi.billed")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" />{" "}
                {t("billing.kpi.collected")}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
