/**
 * Unit Type Manager
 * Side sheet for managing unit types CRUD.
 *
 * Thin container over the NamedType hook/form/table shared with
 * AddonTypeManager -- these two were near-identical duplicates.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NamedTypeForm } from "@/components/namedTypes/NamedTypeForm";
import { NamedTypeTable } from "@/components/namedTypes/NamedTypeTable";
import { useNamedTypeManagerData } from "@/hooks/useNamedTypeManagerData";
import { useI18n } from "@/i18n/useI18n";
import { unitTypeService } from "@/services";

export function UnitTypeSettingsPanel({ residentialId }: { residentialId: string }) {
  const { t } = useI18n();
  const entityLabel = t("units.type.entityLabel");
  const { items, isLoading, isSubmitting, create, update, remove, toggleActive } = useNamedTypeManagerData(
    unitTypeService,
    residentialId,
    true,
    entityLabel,
  );

  return (
    <div className="space-y-4">
      <NamedTypeForm
        entityLabel={entityLabel}
        placeholder={t("units.type.placeholder")}
        isSubmitting={isSubmitting}
        onCreate={create}
      />

      <NamedTypeTable
        entityLabel={entityLabel}
        items={items}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onUpdate={update}
        onDelete={remove}
        onToggleActive={toggleActive}
      />
    </div>
  );
}

interface UnitTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function UnitTypeManager({ open, onOpenChange, residentialId }: UnitTypeManagerProps) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t("units.type.manageTitle")}</SheetTitle>
          <SheetDescription>{t("units.type.manageDescription")}</SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <UnitTypeSettingsPanel residentialId={residentialId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
