/**
 * Installments table shared by the "Period" and "History" tabs. Selection and
 * the bulk-pay action only make sense for the current period, so they're
 * opt-in through `selectable`.
 */

import { useEffect } from "react";
import { useI18n } from "@/i18n/useI18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { formatCurrency } from "@/lib/utils";
import type { UnitInfo } from "@/hooks/useBillingData";
import type { Installment } from "@/types/billing.types";

export function InstallmentStatusBadge({ installment }: { installment: Installment }) {
  const { t } = useI18n();
  if (installment.status === "cancelled") return <Badge variant="secondary">{t("billing.status.cancelled")}</Badge>;
  if (installment.status === "paid") return <Badge variant="success">{t("billing.status.paid")}</Badge>;
  if (installment.is_overdue) {
    return (
      <Badge variant="destructive">
        {t("billing.status.overdue", { days: installment.days_overdue })}
      </Badge>
    );
  }
  if (installment.status === "partial") return <Badge variant="warning">{t("billing.status.partial")}</Badge>;
  return <Badge variant="outline">{t("billing.status.pending")}</Badge>;
}

interface InstallmentTableProps {
  rows: Installment[];
  unitInfoById: Map<string, UnitInfo>;
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  showPeriod?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
  onOpenPayment: (installment: Installment) => void;
  onSetCancelled: (installment: Installment) => void;
  emptyMessage: string;
}

export function InstallmentTable({
  rows,
  unitInfoById,
  isLoading,
  isSubmitting,
  canManage,
  showPeriod = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenPayment,
  onSetCancelled,
  emptyMessage,
}: InstallmentTableProps) {
  const { t } = useI18n();
  const {
    paginatedData,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    resetPage,
  } = usePaginatedSortedData({
    data: rows,
    defaultSortField: (showPeriod ? "period" : "unit_name") as keyof Installment,
    defaultSortOrder: showPeriod ? "desc" : "asc",
    itemsPerPage: 15,
  });

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  // Payable = something left to collect. Select-all covers the visible page's payable rows.
  const payableIds = paginatedData.filter((r) => r.status !== "cancelled" && r.balance > 0).map((r) => r.id);
  const allSelected = payableIds.length > 0 && payableIds.every((id) => selectedIds?.has(id));

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onToggleSelectAll?.(payableIds)}
                    disabled={payableIds.length === 0 || isSubmitting}
                    aria-label={t("billing.table.selectAll")}
                  />
                </TableHead>
              )}
              <SortableTableHead field="unit_name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("billing.table.unit")}
              </SortableTableHead>
              {showPeriod && (
                <SortableTableHead field="period" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                  {t("billing.table.period")}
                </SortableTableHead>
              )}
              <SortableTableHead field="charge_name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("billing.table.charge")}
              </SortableTableHead>
              <SortableTableHead field="due_date" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("billing.table.dueDate")}
              </SortableTableHead>
              <SortableTableHead field="total_due" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("billing.table.total")}
              </SortableTableHead>
              <TableHead>{t("billing.table.paid")}</TableHead>
              <SortableTableHead field="balance" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("billing.table.balance")}
              </SortableTableHead>
              <TableHead>{t("billing.table.status")}</TableHead>
              {canManage && <TableHead className="text-right">{t("common.actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => {
              const info = unitInfoById.get(row.unit_id);
              const payable = row.status !== "cancelled" && row.balance > 0;
              return (
                <TableRow key={row.id}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds?.has(row.id) ?? false}
                        onCheckedChange={() => onToggleSelect?.(row.id)}
                        disabled={!payable || isSubmitting}
                        aria-label={t("billing.table.select", { unit: row.unit_name })}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">{info?.name ?? row.unit_name}</div>
                    {info?.path && <div className="text-xs text-muted-foreground">{info.path}</div>}
                  </TableCell>
                  {showPeriod && <TableCell className="text-sm">{row.period.slice(0, 7)}</TableCell>}
                  <TableCell className="text-sm">{row.charge_name}</TableCell>
                  <TableCell className="text-sm">{row.due_date}</TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(row.total_due)}
                    {row.late_fee > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {t("billing.table.includesFee", { fee: formatCurrency(row.late_fee) })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatCurrency(row.paid_amount)}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(row.balance)}</TableCell>
                  <TableCell>
                    <InstallmentStatusBadge installment={row} />
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => onOpenPayment(row)} disabled={isSubmitting}>
                          {payable ? t("billing.table.pay") : t("billing.table.details")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onSetCancelled(row)} disabled={isSubmitting}>
                          {row.status === "cancelled" ? t("billing.table.reopen") : t("billing.table.cancel")}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
