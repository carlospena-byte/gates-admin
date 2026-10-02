/**
 * Cobranza — monthly recurring charges for the residential: this month's
 * installments (record payments by hand, singly or in bulk), units in
 * arrears, and the full history, with KPIs on top.
 */

import { IconDownload, IconRefresh, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import { ChargeSettingsPanel } from "@/components/ChargeManager";
import { BillingKpis } from "@/components/billing/BillingKpis";
import { BulkPayDialog } from "@/components/billing/BulkPayDialog";
import { DelinquencyTable } from "@/components/billing/DelinquencyTable";
import { InstallmentTable } from "@/components/billing/InstallmentTable";
import { PaymentDialog } from "@/components/billing/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBillingData } from "@/hooks/useBillingData";
import { useI18n } from "@/i18n/useI18n";
import { downloadCsv } from "@/lib/csv";
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
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{t("billing.page.title")}</CardTitle>
                <CardDescription>{t("billing.page.description")}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label={t("billing.page.month")}
                  type="month"
                  value={month}
                  onChange={(e) => {
                    if (e.target.value) {
                      setMonth(e.target.value);
                      setSelectedIds(new Set());
                    }
                  }}
                  className="w-44"
                />
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => void generateMonth()} disabled={isSubmitting}>
                    {t("billing.page.generate")}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => void reload()} disabled={isLoading}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
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
                  {canManage && <TabsTrigger value="charges">{t("billing.tabs.charges")}</TabsTrigger>}
                </TabsList>

                <TabsContent value="period" className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                      <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("billing.filter.searchPlaceholder")}
                        className="pl-9"
                      />
                    </div>
                    <Select value={chargeFilter} onValueChange={setChargeFilter}>
                      <SelectTrigger className="w-48">
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
                      <SelectTrigger className="w-44">
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
                        <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                          {t("billing.bulk.clear")}
                        </Button>
                        <Button size="sm" onClick={() => setBulkOpen(true)} disabled={isSubmitting}>
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

                {canManage && (
                  <TabsContent value="charges" className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t("billing.charges.description")}</p>
                    <ChargeSettingsPanel residentialId={residentialId} />
                  </TabsContent>
                )}

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
                      <SelectTrigger className="w-48" label={t("billing.table.charge")}>
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
                    <Input
                      label={t("billing.history.from")}
                      type="month"
                      value={historyFilters.fromPeriod ?? ""}
                      onChange={(e) => updateHistoryFilter({ fromPeriod: e.target.value || undefined })}
                      className="w-44"
                    />
                    <Input
                      label={t("billing.history.to")}
                      type="month"
                      value={historyFilters.toPeriod ?? ""}
                      onChange={(e) => updateHistoryFilter({ toPeriod: e.target.value || undefined })}
                      className="w-44"
                    />
                    {Object.values(historyFilters).some(Boolean) && (
                      <Button variant="ghost" size="sm" onClick={() => setHistoryFilters({})}>
                        {t("billing.filter.clear")}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={history.length === 0}>
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
