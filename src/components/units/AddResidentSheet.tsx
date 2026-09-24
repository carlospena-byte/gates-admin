/**
 * Right-side sheet for adding a resident — name, email, phone, and
 * (optionally) which unit. Mirrors AddonItemEditSheet's create-form-in-a-
 * sheet shape so the flow matches how add-ons and rentals are added.
 *
 * When `units` is omitted (the UnitResidentsPanel call site, where the
 * unit is already implicit from the page it's opened on), no unit picker
 * is shown. When provided (the residential-wide Residents page), a
 * required unit Select appears.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";

export interface NewResidentFields {
  fullName: string;
  email: string;
  phone: string;
  unitId: string;
}

interface AddResidentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (fields: NewResidentFields) => Promise<boolean>;
  /** When provided, shows a required unit picker (residential-wide usage). */
  units?: UnitWithOwner[];
}

const EMPTY: NewResidentFields = { fullName: "", email: "", phone: "", unitId: "" };

export function AddResidentSheet({ open, onOpenChange, isSubmitting, onCreate, units }: AddResidentSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewResidentFields>(EMPTY);
  const set = <K extends keyof NewResidentFields>(key: K, value: NewResidentFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(EMPTY);
    onOpenChange(nextOpen);
  };

  const needsUnit = !!units;
  const isValid = fields.fullName.trim() && fields.email.trim() && (!needsUnit || fields.unitId);

  const handleAdd = async () => {
    if (!isValid) return;
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
          <SheetTitle>{t("residents.create.title")}</SheetTitle>
          <SheetDescription>{t("residents.create.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {units && (
            <Select value={fields.unitId} onValueChange={(v) => set("unitId", v)} disabled={isSubmitting}>
              <SelectTrigger label={t("common.unit")}>
                <SelectValue placeholder={t("residents.create.selectUnitPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Input
            label={t("residents.create.fullNameLabel")}
            value={fields.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("common.email")}
            type="email"
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("residents.create.phoneLabel")}
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" /> : t("residents.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
