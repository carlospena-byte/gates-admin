/**
 * Cobranza — monthly recurring charges for the residential: this month's
 * installments (record payments by hand, singly or in bulk), units in
 * arrears, and the full history, with KPIs on top.
 */

import { IconDownload, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { BillingKpis } from "@/components/billing/BillingKpis";
import { BulkPayDialog } from "@/components/billing/BulkPayDialog";
import { ImportPaymentsDialog } from "@/components/billing/ImportPaymentsDialog";
import { DelinquencyTable } from "@/components/billing/DelinquencyTable";
import { InstallmentTable } from "@/components/billing/InstallmentTable";
import { PaymentDialog } from "@/components/billing/PaymentDialog";
import { MonthPicker } from "@/components/ui/month-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { navigateTo } from "@/config/routes";
import { useBillingData } from "@/hooks/useBillingData";
import { useI18n } from "@/i18n/useI18n";
import { downloadCsv } from "@/lib/csv";
import { downloadPaymentTemplate } from "@/lib/paymentImport";
import { authService } from "@/services";
import { useSession } from "@/state/useSession";
import { canManageResidential } from "@/state/useAccess";
import type { ResidentialRole } from "@/types/database.types";
import type { Installment, PaymentMethod } from "@/types/billing.types";

const ALL = "all";
type StatusFilter = typeof ALL | "pending" | "partial" | "paid" | "overdue" | "cancelled";

function matchesStatus(row: Installment, status: StatusFilter): boolean {
  switch (status) {
    case ALL:
      return true;
    case "overdue":
      return row.is_overdue;
    case "pending":
      return row.status === "pending" && !row.is_overdue;
    case "partial":
      return row.status === "partial" && !row.is_overdue;
    default:
      return row.status === status;
  }
}

export function BillingPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t } = useI18n();
  const { session } = useSession();
  const canManage = canManageResidential(role);
  const {
    month,
    setMonth,
    summary,
    periodRows,
    delinquents,
    history,
    historyFilters,
    setHistoryFilters,
    charges,
    units,
    unitInfoById,
    isLoading,
    isSubmitting,
    reload,
    recordPayments,
    importPayments,
    deletePayment,
    setCancelled,
    generateMonth,
  } = useBillingData(residentialId);

  const [tab, setTab] = useState("period");
  const [search, setSearch] = useState("");
  const [chargeFilter, setChargeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const unitLabel = (unitId: string, fallback: string) => {
    const info = unitInfoById.get(unitId);
    if (!info) return fallback;
    return info.path ? `${info.path} · ${info.name}` : info.name;
  };

  const filteredPeriod = useMemo(() => {
    const query = search.trim().toLowerCase();
    return periodRows.filter((row) => {
      if (chargeFilter !== ALL && row.charge_id !== chargeFilter) return false;
      if (!matchesStatus(row, statusFilter)) return false;
      if (query) {
        const info = unitInfoById.get(row.unit_id);
        const haystack = `${info?.name ?? row.unit_name} ${info?.path ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [periodRows, chargeFilter, statusFilter, search, unitInfoById]);

  const selectedRows = useMemo(
    () => periodRows.filter((row) => selectedIds.has(row.id) && row.status !== "cancelled" && row.balance > 0),
    [periodRows, selectedIds],
  );

  // The dialog looks the installment up live so its totals refresh after each payment.
  const paymentInstallment = useMemo(
    () => (paymentId ? [...periodRows, ...history].find((row) => row.id === paymentId) ?? null : null),
    [paymentId, periodRows, history],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const handleSetCancelled = (row: Installment) => {
    const cancel = row.status !== "cancelled";
    const toastId = toast(
      t(cancel ? "billing.cancel.confirmTitle" : "billing.cancel.reopenTitle", { charge: row.charge_name }),
      {
        description: t(cancel ? "billing.cancel.confirmDescription" : "billing.cancel.reopenDescription"),
        duration: Infinity,
        action: {
          label: t(cancel ? "billing.table.cancel" : "billing.table.reopen"),
          onClick: async () => {
            toast.dismiss(toastId);
            await setCancelled(row.id, cancel);
          },
        },
        cancel: { label: t("common.cancel"), onClick: () => toast.dismiss(toastId) },
      },
    );
  };

  const handleSinglePayment = async (fields: {
    amount: number;
    paidOn: string;
    method: PaymentMethod;
    reference: string;
  }): Promise<boolean> => {
    if (!paymentInstallment) return false;
    return recordPayments([
      {
        residential_id: residentialId,
        installment_id: paymentInstallment.id,
        amount: fields.amount,
        paid_on: fields.paidOn,
        method: fields.method,
        reference: fields.reference || null,
        created_by: session?.user?.id ?? null,
      },
    ]);
  };

  const handleBulkPay = async (fields: { paidOn: string; method: PaymentMethod; reference: string }) => {
    const ok = await recordPayments(
      selectedRows.map((row) => ({
        residential_id: residentialId,
        installment_id: row.id,
        amount: row.balance,
        paid_on: fields.paidOn,
        method: fields.method,
        reference: fields.reference || null,
        created_by: session?.user?.id ?? null,
      })),
    );
    if (ok) setSelectedIds(new Set());
    return ok;
  };

  const handleViewHistory = (unitId: string) => {
    setHistoryFilters({ unitId });
    setTab("history");
  };

  const handleExport = () => {
    downloadCsv(
      `cobranza-${historyFilters.unitId ? "unidad" : "historial"}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("billing.table.unit"),
        t("billing.table.period"),
        t("billing.table.charge"),
        t("billing.table.dueDate"),
        t("billing.csv.base"),
        t("billing.payment.lateFee"),
        t("billing.table.total"),
        t("billing.table.paid"),
        t("billing.table.balance"),
        t("billing.table.status"),
      ],
      history.map((row) => [
        unitLabel(row.unit_id, row.unit_name),
        row.period.slice(0, 7),
        row.charge_name,
        row.due_date,
        row.base_amount,
        row.late_fee,
        row.total_due,
        row.paid_amount,
        row.balance,
        row.status === "cancelled"
          ? t("billing.status.cancelled")
          : row.status === "paid"
            ? t("billing.status.paid")
            : row.is_overdue
              ? t("billing.status.overdue", { days: row.days_overdue })
              : row.status === "partial"
                ? t("billing.status.partial")
                : t("billing.status.pending"),
      ]),
    );
  };

  const updateHistoryFilter = (patch: Partial<typeof historyFilters>) =>
    setHistoryFilters((prev) => ({ ...prev, ...patch }));

  const hasPeriodFilters = search.trim() !== "" || chargeFilter !== ALL || statusFilter !== ALL;

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          <Card>
            <CardHeader className="flex flex-col gap-5 space-y-0 border-b border-border pb-5 sm:pb-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-2 xl:max-w-xl">
                <CardTitle>{t("billing.page.title")}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{t("billing.page.description")}</CardDescription>
              </div>
              <div className="flex flex-wrap items-stretch gap-3">
                <MonthPicker
                  label={t("billing.page.month")}
                  value={month}
                  onChange={(value) => {
                    if (value) {
                      setMonth(value);
                      setSelectedIds(new Set());
                    }
                  }}
                  className="w-full sm:w-56"
                />
                <div className="flex flex-1 items-stretch gap-2 sm:flex-none">
                  {canManage && (
                    <Button variant="outline" className="h-16 flex-1 px-5 sm:flex-none" onClick={() => navigateTo("settingsCharges")}>
                      {t("billing.page.configure")}
                    </Button>
                  )}
                  {canManage && (
                    <Button variant="outline" className="h-16 flex-1 px-5 sm:flex-none" onClick={() => void generateMonth()} disabled={isSubmitting}>
                      {t("billing.page.generate")}
                    </Button>
                  )}
                  {canManage && (
                    <Button variant="outline" className="h-16 flex-1 px-5 sm:flex-none" onClick={() => setImportOpen(true)} disabled={isSubmitting}>
                      {t("billing.import.button")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-16 w-16 shrink-0"
                    aria-label={t("common.refresh")}
                    onClick={() => void reload()}
                    disabled={isLoading}
                  >
                    <IconRefresh className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              <BillingKpis summary={summary} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                  <TabsTrigger value="period">{t("billing.tabs.period")}</TabsTrigger>
                  <TabsTrigger value="delinquency">
                    {t("billing.tabs.delinquency")}
                    {delinquents.length > 0 ? ` (${delinquents.length})` : ""}
                  </TabsTrigger>
                  <TabsTrigger value="history">{t("billing.tabs.history")}</TabsTrigger>
                </TabsList>

                <TabsContent value="period" className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px] sm:w-auto">
                      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("billing.filter.searchPlaceholder")}
                        className="pl-9"
                      />
                    </div>
                    <Select value={chargeFilter} onValueChange={setChargeFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("billing.filter.allCharges")}</SelectItem>
                        {charges.map((charge) => (
                          <SelectItem key={charge.id} value={charge.id}>
                            {charge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("billing.filter.allStatuses")}</SelectItem>
                        <SelectItem value="pending">{t("billing.status.pending")}</SelectItem>
                        <SelectItem value="partial">{t("billing.status.partial")}</SelectItem>
                        <SelectItem value="overdue">{t("billing.filter.overdue")}</SelectItem>
                        <SelectItem value="paid">{t("billing.status.paid")}</SelectItem>
                        <SelectItem value="cancelled">{t("billing.status.cancelled")}</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasPeriodFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setChargeFilter(ALL);
                          setStatusFilter(ALL);
                        }}
                      >
                        {t("billing.filter.clear")}
                      </Button>
                    )}
                  </div>

                  {canManage && selectedRows.length > 0 && (
                    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 p-2 text-sm">
                      <span>{t("billing.bulk.selected", { count: selectedRows.length })}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
                          {t("billing.bulk.clear")}
                        </Button>
                        <Button onClick={() => setBulkOpen(true)} disabled={isSubmitting}>
                          {t("billing.bulk.markPaid")}
                        </Button>
                      </div>
                    </div>
                  )}

                  <InstallmentTable
                    rows={filteredPeriod}
                    unitInfoById={unitInfoById}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    canManage={canManage}
                    selectable={canManage}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onOpenPayment={(row) => setPaymentId(row.id)}
                    onSetCancelled={handleSetCancelled}
                    emptyMessage={periodRows.length === 0 ? t("billing.period.empty") : t("billing.filter.noResults")}
                  />
                </TabsContent>

                <TabsContent value="delinquency" className="space-y-4">
                  <p className="text-sm text-muted-foreground">{t("billing.delinquency.description")}</p>
                  <DelinquencyTable
                    rows={delinquents}
                    unitInfoById={unitInfoById}
                    isLoading={isLoading}
                    onViewHistory={handleViewHistory}
                  />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <div className="flex flex-wrap items-end gap-2">
                    <Select
                      value={historyFilters.unitId ?? ALL}
                      onValueChange={(v) => updateHistoryFilter({ unitId: v === ALL ? undefined : v })}
                    >
                      <SelectTrigger className="w-52" label={t("billing.table.unit")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("billing.filter.allUnits")}</SelectItem>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unitLabel(unit.id, unit.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={historyFilters.chargeId ?? ALL}
                      onValueChange={(v) => updateHistoryFilter({ chargeId: v === ALL ? undefined : v })}
                    >
                      <SelectTrigger className="w-full sm:w-48" label={t("billing.table.charge")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL}>{t("billing.filter.allCharges")}</SelectItem>
                        {charges.map((charge) => (
                          <SelectItem key={charge.id} value={charge.id}>
                            {charge.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <MonthPicker
                      clearable
                      label={t("billing.history.from")}
                      value={historyFilters.fromPeriod ?? ""}
                      onChange={(value) => updateHistoryFilter({ fromPeriod: value || undefined })}
                      className="w-full sm:w-52"
                    />
                    <MonthPicker
                      clearable
                      label={t("billing.history.to")}
                      value={historyFilters.toPeriod ?? ""}
                      onChange={(value) => updateHistoryFilter({ toPeriod: value || undefined })}
                      className="w-full sm:w-52"
                    />
                    {Object.values(historyFilters).some(Boolean) && (
                      <Button variant="ghost" size="sm" onClick={() => setHistoryFilters({})}>
                        {t("billing.filter.clear")}
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleExport} disabled={history.length === 0}>
                      <IconDownload className="mr-1 h-4 w-4" /> {t("billing.history.export")}
                    </Button>
                  </div>

                  <InstallmentTable
                    rows={history}
                    unitInfoById={unitInfoById}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    canManage={canManage}
                    showPeriod
                    onOpenPayment={(row) => setPaymentId(row.id)}
                    onSetCancelled={handleSetCancelled}
                    emptyMessage={t("billing.history.empty")}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        installment={paymentInstallment}
        unitLabel={paymentInstallment ? unitLabel(paymentInstallment.unit_id, paymentInstallment.unit_name) : ""}
        canManage={canManage}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) setPaymentId(null);
        }}
        onSubmit={handleSinglePayment}
        onDeletePayment={deletePayment}
      />

      <ImportPaymentsDialog
        open={importOpen}
        isSubmitting={isSubmitting}
        onOpenChange={setImportOpen}
        onDownloadTemplate={() =>
          downloadPaymentTemplate(`plantilla-pagos-${month}.csv`, periodRows, unitLabel)
        }
        onImport={importPayments}
      />

      <BulkPayDialog
        open={bulkOpen}
        installments={selectedRows}
        isSubmitting={isSubmitting}
        onOpenChange={setBulkOpen}
        onConfirm={handleBulkPay}
      />
    </div>
  );
}
