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

interface AddonManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function AddonManager({ open, onOpenChange, residentialId }: AddonManagerProps) {
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  const { addons, addonTypes, isLoading, isSubmitting, reload, createAddon, updateAddon, deleteAddon, toggleActive } =
    useAddonManagerData(residentialId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Manage Addons</SheetTitle>
              <SheetDescription>
                Create and manage addons for units (Covered Parking, Storage Unit, etc.)
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTypeManagerOpen(true)}>
              <SettingsIcon />
              <span className="ml-2">Manage Types</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <AddonCreateForm addonTypes={addonTypes} isSubmitting={isSubmitting} onCreate={createAddon} />

          <AddonTable
            addons={addons}
            addonTypes={addonTypes}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            onUpdate={updateAddon}
            onDelete={deleteAddon}
            onToggleActive={toggleActive}
          />
        </div>
      </SheetContent>

      <AddonTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={reload}
      />
    </Sheet>
  );
}
