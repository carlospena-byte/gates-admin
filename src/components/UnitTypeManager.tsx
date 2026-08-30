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
import { unitTypeService } from "@/services";

export function UnitTypeSettingsPanel({ residentialId }: { residentialId: string }) {
  const { items, isLoading, isSubmitting, create, update, remove, toggleActive } = useNamedTypeManagerData(
    unitTypeService,
    residentialId,
    true,
    "Unit Type",
  );

  return (
    <div className="space-y-4">
      <NamedTypeForm
        entityLabel="Unit Type"
        placeholder="e.g., Apartment, House, Studio..."
        isSubmitting={isSubmitting}
        onCreate={create}
      />

      <NamedTypeTable
        entityLabel="Unit Type"
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Manage Unit Types</SheetTitle>
          <SheetDescription>
            Create and manage unit type categories (Apartment, House, etc.)
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <UnitTypeSettingsPanel residentialId={residentialId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
