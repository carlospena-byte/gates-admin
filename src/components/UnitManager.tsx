/**
 * Unit Manager
 * Side sheet for managing units CRUD with relationships.
 *
 * This is a thin container: data/mutations live in useUnitManagerData,
 * the create form and the existing-units table are self-contained
 * components under components/units/.
 */

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UnitCreateForm } from "@/components/units/UnitCreateForm";
import { UnitTable } from "@/components/units/UnitTable";
import { useUnitManagerData, type UnitFormPayload } from "@/hooks/useUnitManagerData";
import { useI18n } from "@/i18n/useI18n";

interface UnitManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  showList?: boolean;
  /** Called after a unit is created here, so a unit list rendered elsewhere can refresh. */
  onUnitCreated?: () => void;
}

export function UnitManager({
  open,
  onOpenChange,
  residentialId,
  showList = true,
  onUnitCreated,
}: UnitManagerProps) {
  const { t } = useI18n();
  const {
    units,
    unitTypes,
    locations,
    locationTypes,
    addonItems,
    addonTypes,
    isLoading,
    isSubmitting,
    createUnit,
    deleteUnit,
    toggleActive,
  } = useUnitManagerData(residentialId, open, showList);

  const handleCreate = async (payload: UnitFormPayload) => {
    const ok = await createUnit(payload);
    if (ok) onUnitCreated?.();
    return ok;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>{t("units.manager.title")}</SheetTitle>
          <SheetDescription>{t("units.manager.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <UnitCreateForm
            unitTypes={unitTypes}
            locations={locations}
            locationTypes={locationTypes}
            addonItems={addonItems}
            addonTypes={addonTypes}
            isSubmitting={isSubmitting}
            onCreate={handleCreate}
          />

          {showList ? (
            <UnitTable
              units={units}
              locations={locations}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              canManage
              onDelete={deleteUnit}
              onToggleActive={toggleActive}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
