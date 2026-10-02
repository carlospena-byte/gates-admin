/**
 * Charge Manager
 * Side sheet for managing recurring monthly charges CRUD (e.g. "Seguridad").
 * Assigning a charge to units happens on the charge's own detail page
 * (see ChargeDetailPage) — Edit here navigates there.
 */

import { useI18n } from "@/i18n/useI18n";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

interface ChargeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function ChargeManager({ open, onOpenChange, residentialId }: ChargeManagerProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{t("charges.manager.title")}</SheetTitle>
          <SheetDescription>{t("charges.manager.description")}</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <ChargeSettingsPanel residentialId={residentialId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
