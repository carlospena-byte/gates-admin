/**
 * Data for the Cobranza page: KPIs and installments for the selected month,
 * the delinquent-units report, the history query, and the mutations an admin
 * performs by hand (record / delete a payment, cancel / reopen an installment).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { billingService, chargeService, locationService, unitService, monthToPeriod } from "@/services";
import { useI18n } from "@/i18n/useI18n";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import type {
  BillingSummary,
  DelinquentUnit,
  HistoryFilters,
  Installment,
  NewChargePayment,
} from "@/types/billing.types";
import type { Charge, Location, UnitWithWizardData } from "@/types/unit-wizard.types";

export interface UnitInfo {
  name: string;
  path: string;
}

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useBillingData(residentialId: string) {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonth);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [periodRows, setPeriodRows] = useState<Installment[]>([]);
  const [delinquents, setDelinquents] = useState<DelinquentUnit[]>([]);
  const [history, setHistory] = useState<Installment[]>([]);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({});
  const [charges, setCharges] = useState<Charge[]>([]);
  const [units, setUnits] = useState<UnitWithWizardData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitInfoById = useMemo(() => {
    const map = new Map<string, UnitInfo>();
    for (const unit of units) {
      const location = unit.location_id ? locations.find((l) => l.id === unit.location_id) : undefined;
      map.set(unit.id, { name: unit.name, path: getLocationFullPath(location, locations, " · ") });
    }
    return map;
  }, [units, locations]);

  const loadHistory = useCallback(
    async (filters: HistoryFilters) => {
      const result = await billingService.listHistory(residentialId, filters);
      if (result.success) {
        setHistory(result.data);
      } else {
        toast.error(result.error.message);
      }
    },
    [residentialId],
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    const period = monthToPeriod(month);
    const [summaryResult, rowsResult, delinquentResult] = await Promise.all([
      billingService.getSummary(residentialId, period),
      billingService.listByPeriod(residentialId, period),
      billingService.listDelinquentUnits(residentialId),
    ]);
    setIsLoading(false);

    if (summaryResult.success) setSummary(summaryResult.data);
    else toast.error(summaryResult.error.message);
    if (rowsResult.success) setPeriodRows(rowsResult.data);
    else toast.error(rowsResult.error.message);
    if (delinquentResult.success) setDelinquents(delinquentResult.data);
    else toast.error(delinquentResult.error.message);
  }, [residentialId, month]);

  // Static lookups, loaded once.
  useEffect(() => {
    void (async () => {
      const [chargesResult, unitsResult, locationsResult] = await Promise.all([
        chargeService.list(residentialId),
        unitService.listWithRelations(residentialId),
        locationService.list(residentialId),
      ]);
      if (chargesResult.success) setCharges(chargesResult.data);
      if (unitsResult.success) setUnits(unitsResult.data);
      if (locationsResult.success) setLocations(locationsResult.data);
    })();
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void loadHistory(historyFilters);
  }, [loadHistory, historyFilters]);

  /** Re-reads everything a change to an installment can affect. */
  const refreshAll = useCallback(async () => {
    await Promise.all([reload(), loadHistory(historyFilters)]);
  }, [reload, loadHistory, historyFilters]);

  const recordPayments = useCallback(
    async (payments: NewChargePayment[]): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await billingService.addPayments(payments);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success(t("billing.toast.paymentsRecorded", { count: payments.length }));
      await refreshAll();
      return true;
    },
    [refreshAll, t],
  );

  const deletePayment = useCallback(
    async (paymentId: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await billingService.deletePayment(paymentId);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  const setCancelled = useCallback(
    async (installmentId: string, cancelled: boolean): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await billingService.setCancelled(installmentId, cancelled);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      await refreshAll();
      return true;
    },
    [refreshAll],
  );

  /** Creates any installments still missing for the selected month, for every active charge. */
  const generateMonth = useCallback(async () => {
    setIsSubmitting(true);
    const result = await chargeService.generateInstallments(residentialId, monthToPeriod(month));
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    toast.success(t("billing.toast.generated", { count: result.data }));
    await refreshAll();
  }, [residentialId, month, refreshAll, t]);

  return {
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
    reload: refreshAll,
    recordPayments,
    deletePayment,
    setCancelled,
    generateMonth,
  };
}
