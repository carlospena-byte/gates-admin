/**
 * Right-side sheet for authorizing a recurring visitor (familiar, empleado,
 * proveedor...) — no single date/window like a one-off visit: it stays
 * "scheduled" (active) until an admin cancels it, gated instead by which
 * days and hours it's valid for. Mirrors AddVisitorSheet's shape.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";
import type { Recurrence, RecurrenceDay, ScheduleType, VisitorRole } from "@/types/visitor.types";

const NOTES_MAX_LENGTH = 120;

const VISITOR_ROLES: VisitorRole[] = ["familiar", "entrenador", "empleado", "proveedor", "visitante", "invitado"];
const RECURRENCES: Recurrence[] = ["mon_fri", "mon_sat", "daily", "custom"];
const SCHEDULE_TYPES: ScheduleType[] = ["all_day", "custom"];
const DAYS: RecurrenceDay[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export interface NewFrequentVisitFields {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  visitorRole: VisitorRole;
  recurrence: Recurrence;
  recurrenceDays: RecurrenceDay[];
  scheduleType: ScheduleType;
  scheduleStart: string;
  scheduleEnd: string;
  notes: string;
}

interface AddFrequentVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  isSubmitting: boolean;
  onCreate: (fields: NewFrequentVisitFields) => Promise<boolean>;
}

function defaultFields(): NewFrequentVisitFields {
  return {
    name: "",
    phone: "",
    plate: "",
    unitId: "",
    visitorRole: "familiar",
    recurrence: "daily",
    recurrenceDays: [],
    scheduleType: "all_day",
    scheduleStart: "06:00",
    scheduleEnd: "20:00",
    notes: "",
  };
}

export function AddFrequentVisitSheet({ open, onOpenChange, units, isSubmitting, onCreate }: AddFrequentVisitSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewFrequentVisitFields>(defaultFields);
  const set = <K extends keyof NewFrequentVisitFields>(key: K, value: NewFrequentVisitFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields());
    onOpenChange(nextOpen);
  };

  const toggleDay = (day: RecurrenceDay) => {
    setFields((prev) => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter((d) => d !== day)
        : [...prev.recurrenceDays, day],
    }));
  };

  const isValid =
    fields.name.trim().length > 0 &&
    (fields.recurrence !== "custom" || fields.recurrenceDays.length > 0) &&
    (fields.scheduleType !== "custom" || (fields.scheduleStart && fields.scheduleEnd));

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

          <Select value={fields.visitorRole} onValueChange={(value) => set("visitorRole", value as VisitorRole)} disabled={isSubmitting}>
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

          <Select value={fields.recurrence} onValueChange={(value) => set("recurrence", value as Recurrence)} disabled={isSubmitting}>
            <SelectTrigger label={t("visitors.frequent.recurrenceLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t(`visitors.frequent.recurrence.${r}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fields.recurrence === "custom" && (
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <Checkbox
                  key={day}
                  checked={fields.recurrenceDays.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                  label={t(`visitors.frequent.day.${day}`)}
                  disabled={isSubmitting}
                />
              ))}
            </div>
          )}

          <Select value={fields.scheduleType} onValueChange={(value) => set("scheduleType", value as ScheduleType)} disabled={isSubmitting}>
            <SelectTrigger label={t("visitors.frequent.scheduleLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_TYPES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`visitors.frequent.schedule.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {fields.scheduleType === "custom" && (
            <div className="grid gap-2 grid-cols-2">
              <Input
                label={t("visitors.frequent.scheduleStartLabel")}
                type="time"
                value={fields.scheduleStart}
                onChange={(e) => set("scheduleStart", e.target.value)}
                disabled={isSubmitting}
              />
              <Input
                label={t("visitors.frequent.scheduleEndLabel")}
                type="time"
                value={fields.scheduleEnd}
                onChange={(e) => set("scheduleEnd", e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}

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
