/**
 * Right-side sheet for adding a vehicle to a unit — plate, brand, model,
 * color. Mirrors AddResidentSheet's create-form-in-a-sheet shape.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";

export interface NewVehicleFields {
  plate: string;
  brand: string;
  model: string;
  color: string;
}

interface AddVehicleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (fields: NewVehicleFields) => Promise<boolean>;
}

const EMPTY: NewVehicleFields = { plate: "", brand: "", model: "", color: "" };

export function AddVehicleSheet({ open, onOpenChange, isSubmitting, onCreate }: AddVehicleSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewVehicleFields>(EMPTY);
  const set = <K extends keyof NewVehicleFields>(key: K, value: NewVehicleFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(EMPTY);
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!fields.plate.trim()) return;
    const ok = await onCreate(fields);
    if (ok) {
      setFields(EMPTY);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("vehicles.create.title")}</SheetTitle>
          <SheetDescription>{t("vehicles.create.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label={t("vehicles.table.plate")}
            value={fields.plate}
            onChange={(e) => set("plate", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("vehicles.create.brandLabel")}
            value={fields.brand}
            onChange={(e) => set("brand", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("vehicles.create.modelLabel")}
            value={fields.model}
            onChange={(e) => set("model", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("vehicles.create.colorLabel")}
            value={fields.color}
            onChange={(e) => set("color", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.plate.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : t("vehicles.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
