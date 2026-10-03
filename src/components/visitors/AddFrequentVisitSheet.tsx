/**
 * Right-side sheet for registering a visitor at the gate. No frequency or
 * schedule: entry time is the creation time and the exit is logged when the
 * admin checks the visitor out (see createFrequentVisit).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import { IdPhotoField } from "./IdPhotoField";
import type { UnitWithOwner } from "@/services";
import type { Location } from "@/types/unit-wizard.types";
import { UnitCombobox } from "@/components/units/UnitCombobox";
import type { VisitorRole } from "@/types/visitor.types";

const NOTES_MAX_LENGTH = 120;

const VISITOR_ROLES: VisitorRole[] = ["familiar", "entrenador", "empleado", "proveedor", "visitante", "invitado"];

export interface NewFrequentVisitFields {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  visitorRole: VisitorRole;
  notes: string;
  idPhoto: File | null;
}

interface AddFrequentVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  locations?: Location[];
  isSubmitting: boolean;
  onCreate: (fields: NewFrequentVisitFields) => Promise<boolean>;
  /** Pre-selected role for the form. */
  initialRole?: VisitorRole;
}

function defaultFields(visitorRole: VisitorRole): NewFrequentVisitFields {
  return {
    name: "",
    phone: "",
    plate: "",
    unitId: "",
    visitorRole,
    notes: "",
    idPhoto: null,
  };
}

export function AddFrequentVisitSheet({ open, onOpenChange, units, locations = [], isSubmitting, onCreate, initialRole = "visitante" }: AddFrequentVisitSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewFrequentVisitFields>(() => defaultFields(initialRole));
  const set = <K extends keyof NewFrequentVisitFields>(key: K, value: NewFrequentVisitFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields(initialRole));
    onOpenChange(nextOpen);
  };

  const isValid = fields.name.trim().length > 0;

  const handleAdd = async () => {
    if (!isValid) return;
    const ok = await onCreate(fields);
    if (ok) {
      setFields(defaultFields(initialRole));
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("visitors.frequent.title")}</SheetTitle>
          <SheetDescription>{t("visitors.frequent.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label={t("visitors.create.nameLabel")}
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isSubmitting}
          />

          <Select value={fields.visitorRole} onValueChange={(value) => set("visitorRole", value as VisitorRole)} disabled>
            <SelectTrigger label={t("visitors.frequent.roleLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISITOR_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`visitors.frequent.role.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-2 grid-cols-1">
            <Input
              label={t("visitors.create.phoneLabel")}
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("visitors.create.plateLabel")}
              value={fields.plate}
              onChange={(e) => set("plate", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <UnitCombobox
            units={units}
            locations={locations}
            value={fields.unitId}
            onChange={(unitId) => set("unitId", unitId)}
            label={t("visitors.create.unitLabel")}
            emptyLabel={t("visitors.create.noSpecificUnit")}
            disabled={isSubmitting}
          />

          <Textarea
            label={t("visitors.create.notesLabel")}
            value={fields.notes}
            maxLength={NOTES_MAX_LENGTH}
            onChange={(e) => set("notes", e.target.value)}
            disabled={isSubmitting}
            helper={`${fields.notes.length}/${NOTES_MAX_LENGTH}`}
          />

          <IdPhotoField file={fields.idPhoto} onChange={(file) => set("idPhoto", file)} disabled={isSubmitting} />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" /> : t("visitors.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
