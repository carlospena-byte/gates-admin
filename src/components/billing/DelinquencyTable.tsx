import { useI18n } from "@/i18n/useI18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { formatCurrency } from "@/lib/utils";
import type { UnitInfo } from "@/hooks/useBillingData";
import type { DelinquentUnit } from "@/types/billing.types";

interface DelinquencyTableProps {
  rows: DelinquentUnit[];
  unitInfoById: Map<string, UnitInfo>;
  isLoading: boolean;
  onViewHistory: (unitId: string) => void;
}

/** One row per unit with overdue installments, biggest debt first (the server orders them). */
export function DelinquencyTable({ rows, unitInfoById, isLoading, onViewHistory }: DelinquencyTableProps) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("billing.delinquency.empty")}</div>;
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("billing.table.unit")}</TableHead>
            <TableHead>{t("billing.delinquency.installments")}</TableHead>
            <TableHead>{t("billing.table.charge")}</TableHead>
            <TableHead>{t("billing.delinquency.oldest")}</TableHead>
            <TableHead>{t("billing.delinquency.lateFees")}</TableHead>
            <TableHead>{t("billing.delinquency.owed")}</TableHead>
            <TableHead className="text-right">{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const info = unitInfoById.get(row.unit_id);
            return (
              <TableRow key={row.unit_id}>
                <TableCell>
                  <div className="font-medium">{info?.name ?? row.unit_name}</div>
                  {info?.path && <div className="text-xs text-muted-foreground">{info.path}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant={row.overdue_count >= 2 ? "destructive" : "warning"}>{row.overdue_count}</Badge>
                </TableCell>
                <TableCell className="text-sm">{row.charge_names.join(", ")}</TableCell>
                <TableCell className="text-sm">
                  {row.oldest_due_date}
                  <div className="text-xs text-muted-foreground">
                    {t("billing.delinquency.days", { days: row.max_days_overdue })}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{formatCurrency(row.late_fees)}</TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(row.overdue_balance)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => onViewHistory(row.unit_id)}>
                    {t("billing.delinquency.viewHistory")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
