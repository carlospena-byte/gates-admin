/**
 * Addon Manager
 * Side sheet for managing addons CRUD.
 *
 * Thin container: data/mutations live in useAddonManagerData, the create
 * form and the existing-addons table are self-contained components under
 * components/addons/.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SettingsIcon } from "@/components/icons";
import { AddonCreateForm } from "@/components/addons/AddonCreateForm";
import { AddonTable } from "@/components/addons/AddonTable";
import { AddonTypeManager } from "@/components/AddonTypeManager";
import { useAddonManagerData } from "@/hooks/useAddonManagerData";

export function AddonSettingsPanel({ residentialId }: { residentialId: string }) {
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  const { addons, addonTypes, isLoading, isSubmitting, reload, createAddon, deleteAddon, toggleActive } =
    useAddonManagerData(residentialId, true);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setTypeManagerOpen(true)}>
          <SettingsIcon />
          <span className="ml-2">Manage Types</span>
        </Button>
      </div>

      <AddonCreateForm addonTypes={addonTypes} isSubmitting={isSubmitting} onCreate={createAddon} />

      <AddonTable
        addons={addons}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        onDelete={deleteAddon}
        onToggleActive={toggleActive}
      />

      <AddonTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={reload}
      />
    </div>
  );
}

interface AddonManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function AddonManager({ open, onOpenChange, residentialId }: AddonManagerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Manage Addons</SheetTitle>
          <SheetDescription>
            Create and manage addons for units (Covered Parking, Storage Unit, etc.)
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <AddonSettingsPanel residentialId={residentialId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
