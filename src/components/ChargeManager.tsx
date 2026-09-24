/**
 * Charge Manager
 * Side sheet for managing recurring extra charges CRUD (e.g. "Seguridad").
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
import { useChargeManagerData } from "@/hooks/useChargeManagerData";

export function ChargeSettingsPanel({ residentialId }: { residentialId: string }) {
  const { charges, isLoading, isSubmitting, createCharge, deleteCharge, toggleActive } = useChargeManagerData(
    residentialId,
    true,
  );

  return (
    <div className="space-y-4">
      <ChargeCreateForm isSubmitting={isSubmitting} onCreate={createCharge} />

      <ChargeTable
        charges={charges}
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
