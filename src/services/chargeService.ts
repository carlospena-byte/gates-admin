/**
 * Charge Service
 * Handles CRUD for recurring monthly charges (e.g. "Seguridad",
 * "Mantenimiento y Limpieza") — separate from addons — plus how many units
 * each one currently covers and manual (re)generation of a month's installments.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { createCrudService } from "./createCrudService";
import type { Charge, CreateChargeDto, LateFeeRecurrence, UpdateChargeDto } from "@/types/unit-wizard.types";

const base = createCrudService<Charge, CreateChargeDto, UpdateChargeDto>("charges");

/** charge_id -> number of active units its rules currently resolve to. */
function unitCounts(residentialId: string): Promise<ApiResult<Record<string, number>>> {
  return wrapResult("Failed to load charge unit counts", async () => {
    const rows = await unwrap<{ charge_id: string; unit_count: number }[]>(
      requireSupabase().rpc("charge_unit_counts", { _residential_id: residentialId }),
    );
    return Object.fromEntries((rows ?? []).map((r) => [r.charge_id, Number(r.unit_count)]));
  });
}

/**
 * Creates the missing installments for the month of `period` (YYYY-MM-DD) —
 * for one charge or all of them. Safe to re-run; returns how many were created.
 */
function generateInstallments(
  residentialId: string,
  period: string,
  chargeId?: string,
): Promise<ApiResult<number>> {
  return wrapResult("Failed to generate installments", async () => {
    const count = await unwrap<number>(
      requireSupabase().rpc("generate_charge_installments", {
        _residential_id: residentialId,
        _period: period,
        _charge_id: chargeId,
      }),
    );
    return Number(count ?? 0);
  });
}

/** Per-residential policy: is the late fee charged once, or again every overdue month? */
function getLateFeeRecurrence(residentialId: string): Promise<ApiResult<LateFeeRecurrence>> {
  return wrapResult("Failed to load billing settings", async () => {
    const row = await unwrap<{ late_fee_recurrence: LateFeeRecurrence } | null>(
      requireSupabase()
        .from("residential_billing_settings")
        .select("late_fee_recurrence")
        .eq("residential_id", residentialId)
        .maybeSingle(),
    );
    return row?.late_fee_recurrence ?? "once";
  });
}

function setLateFeeRecurrence(residentialId: string, value: LateFeeRecurrence): Promise<ApiResult<void>> {
  return wrapResult("Failed to save billing settings", () =>
    unwrap<void>(
      requireSupabase()
        .from("residential_billing_settings")
        .upsert({ residential_id: residentialId, late_fee_recurrence: value }, { onConflict: "residential_id" }),
    ),
  );
}

export const chargeService = {
  ...base,
  unitCounts,
  generateInstallments,
  getLateFeeRecurrence,
  setLateFeeRecurrence,
};
