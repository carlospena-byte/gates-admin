/**
 * Charge settings panel (Settings -> Charges): recurring monthly charges CRUD
 * (e.g. "Seguridad") plus the residential's late-fee policy. Who pays each
 * charge is set on the charge's own detail page (see ChargeDetailPage) —
 * creating or editing one navigates there.
 */

import { useI18n } from "@/i18n/useI18n";
import { ChargeCreateForm } from "@/components/charges/ChargeCreateForm";
import { ChargeTable } from "@/components/charges/ChargeTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LateFeeRecurrence } from "@/types/unit-wizard.types";
import { useChargeManagerData } from "@/hooks/useChargeManagerData";

export function ChargeSettingsPanel({ residentialId }: { residentialId: string }) {
  const { t } = useI18n();
  const {
    charges,
    unitCounts,
    lateFeeRecurrence,
    setLateFeeRecurrence,
    isLoading,
    isSubmitting,
    createCharge,
    deleteCharge,
    toggleActive,
  } = useChargeManagerData(residentialId, true);

  return (
    <div className="space-y-4">
      <ChargeCreateForm isSubmitting={isSubmitting} onCreate={createCharge} />

      <div className="space-y-1">
        <Select value={lateFeeRecurrence} onValueChange={(v) => void setLateFeeRecurrence(v as LateFeeRecurrence)}>
          <SelectTrigger label={t("charges.policy.recurrence.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="once">{t("charges.policy.recurrence.once")}</SelectItem>
            <SelectItem value="monthly">{t("charges.policy.recurrence.monthly")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("charges.policy.recurrence.help")}</p>
      </div>

      <ChargeTable
        charges={charges}
        unitCounts={unitCounts}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onDelete={deleteCharge}
        onToggleActive={toggleActive}
      />
    </div>
  );
}
