/**
 * Right-side sheet for a single-day delivery/vendor visit — simpler than
 * AddVisitorSheet's date-range: just one calendar date (valid_from/
 * valid_until are derived as that day's full window so the existing Today/
 * Upcoming bucket logic in VisitorsPage keeps working unchanged).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";
import type { ProviderKind } from "@/types/visitor.types";

const NOTES_MAX_LENGTH = 120;
const PROVIDER_KINDS: ProviderKind[] = ["proveedor", "delivery", "paqueteria"];

export interface NewDeliveryVisitFields {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  providerKind: ProviderKind;
  visitDate: string; // "YYYY-MM-DD"
  notes: string;
}

interface AddDeliveryVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  isSubmitting: boolean;
  onCreate: (fields: NewDeliveryVisitFields) => Promise<boolean>;
}

function toDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultFields(): NewDeliveryVisitFields {
  return {
    name: "",
    phone: "",
    plate: "",
    unitId: "",
    providerKind: "delivery",
    visitDate: toDateValue(new Date()),
    notes: "",
  };
}

export function AddDeliveryVisitSheet({ open, onOpenChange, units, isSubmitting, onCreate }: AddDeliveryVisitSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewDeliveryVisitFields>(defaultFields);
  const set = <K extends keyof NewDeliveryVisitFields>(key: K, value: NewDeliveryVisitFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields());
    onOpenChange(nextOpen);
  };

  const isValid = fields.name.trim().length > 0 && fields.visitDate.length > 0;

  const handleAdd = async () => {
    if (!isValid) return;
    const ok = await onCreate(fields);
    if (ok) {
      setFields(defaultFields());
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("visitors.delivery.title")}</SheetTitle>
          <SheetDescription>{t("visitors.delivery.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Select
            value={fields.providerKind}
            onValueChange={(value) => set("providerKind", value as ProviderKind)}
            disabled={isSubmitting}
          >
            <SelectTrigger label={t("visitors.delivery.typeLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t(`visitors.delivery.type.${kind}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            label={t("visitors.create.nameLabel")}
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isSubmitting}
          />

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

          <Select
            value={fields.unitId || "none"}
            onValueChange={(value) => set("unitId", value === "none" ? "" : value)}
            disabled={isSubmitting}
          >
            <SelectTrigger label={t("visitors.create.unitLabel")}>
              <SelectValue placeholder={t("visitors.create.noSpecificUnit")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("visitors.create.noSpecificUnit")}</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            label={t("visitors.delivery.dateLabel")}
            type="date"
            value={fields.visitDate}
            onChange={(e) => set("visitDate", e.target.value)}
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
