/**
 * Addon Type Manager
 * Side sheet for managing addon types CRUD.
 *
 * Thin container over the NamedType hook/form/table shared with
 * UnitTypeManager -- these two were near-identical duplicates.
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
import { addonTypeService } from "@/services";

interface AddonTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  onTypesUpdated?: () => void;
}

export function AddonTypeManager({ open, onOpenChange, residentialId, onTypesUpdated }: AddonTypeManagerProps) {
  const { items, isLoading, isSubmitting, create, update, remove, toggleActive } = useNamedTypeManagerData(
    addonTypeService,
    residentialId,
    open,
    "Addon Type",
    onTypesUpdated,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Manage Addon Types</SheetTitle>
          <SheetDescription>
            Create and manage addon type categories (Parking, Storage, etc.)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <NamedTypeForm
            entityLabel="Addon Type"
            placeholder="e.g., Parking, Storage, Gym..."
            isSubmitting={isSubmitting}
            onCreate={create}
          />

          <NamedTypeTable
            entityLabel="Addon Type"
            items={items}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            onUpdate={update}
            onDelete={remove}
            onToggleActive={toggleActive}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
