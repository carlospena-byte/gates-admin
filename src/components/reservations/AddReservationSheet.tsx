/**
 * Right-side sheet for booking a time slot on the currently-selected
 * amenity. Booking is always for the current session user — the only
 * insert policy amenity_bookings has is "insert self" (user_id = auth.uid()).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";

const MAX_HOURS = 6;

export interface UnitOption {
  id: string;
  name: string;
}

export interface AmenityOption {
  id: string;
  name: string;
}

export interface NewReservationFields {
  amenityId: string;
  unitId: string;
  startTime: string;
  hours: number;
  notes: string;
}

interface AddReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenities: AmenityOption[];
  units: UnitOption[];
  isSubmitting: boolean;
  onCreate: (fields: NewReservationFields) => Promise<boolean>;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFields(): NewReservationFields {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return { amenityId: "", unitId: "", startTime: toDatetimeLocalValue(now), hours: 1, notes: "" };
}

export function AddReservationSheet({ open, onOpenChange, amenities, units, isSubmitting, onCreate }: AddReservationSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewReservationFields>(defaultFields);
  const set = <K extends keyof NewReservationFields>(key: K, value: NewReservationFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields());
    onOpenChange(nextOpen);
  };

  const isValid =
    Boolean(fields.amenityId) &&
    Boolean(fields.unitId) &&
    Boolean(fields.startTime) &&
    fields.hours > 0 &&
    fields.hours <= MAX_HOURS;

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
          <SheetTitle>{t("reservations.add.title")}</SheetTitle>
          <SheetDescription>{t("reservations.add.description", { hours: MAX_HOURS })}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Select value={fields.amenityId} onValueChange={(value) => set("amenityId", value)}>
            <SelectTrigger label={t("reservations.add.amenity.label")}>
              <SelectValue placeholder={t("reservations.add.amenity.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {amenities.map((amenity) => (
                <SelectItem key={amenity.id} value={amenity.id}>
                  {amenity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fields.unitId} onValueChange={(value) => set("unitId", value)}>
            <SelectTrigger label={t("reservations.add.unit.label")}>
              <SelectValue placeholder={t("reservations.add.unit.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-2 grid-cols-1">
            <Input
              label={t("reservations.add.start.label")}
              type="datetime-local"
              value={fields.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label={t("reservations.add.hours.label", { hours: MAX_HOURS })}
              type="number"
              min={1}
              max={MAX_HOURS}
              step={0.5}
              value={fields.hours}
              onChange={(e) => set("hours", Number(e.target.value))}
              disabled={isSubmitting}
            />
          </div>
          {fields.hours > MAX_HOURS ? (
            <p className="text-sm text-destructive">{t("reservations.add.hours.error", { hours: MAX_HOURS })}</p>
          ) : null}

          <Input
            label={t("reservations.add.notes.label")}
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" /> : t("reservations.add.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
