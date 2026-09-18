/**
 * Right-side sheet for booking a time slot on the currently-selected
 * amenity. Booking is always for the current session user — the only
 * insert policy amenity_bookings has is "insert self" (user_id = auth.uid()).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";

export interface NewReservationFields {
  startTime: string;
  endTime: string;
  notes: string;
}

interface AddReservationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amenityName: string;
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
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  return { startTime: toDatetimeLocalValue(now), endTime: toDatetimeLocalValue(later), notes: "" };
}

export function AddReservationSheet({ open, onOpenChange, amenityName, isSubmitting, onCreate }: AddReservationSheetProps) {
  const [fields, setFields] = useState<NewReservationFields>(defaultFields);
  const set = <K extends keyof NewReservationFields>(key: K, value: NewReservationFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields());
    onOpenChange(nextOpen);
  };

  const isValid = fields.startTime && fields.endTime && fields.endTime > fields.startTime;

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
          <SheetTitle>Book {amenityName}</SheetTitle>
          <SheetDescription>Choose a time window — overlapping bookings are rejected automatically.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Start"
              type="datetime-local"
              value={fields.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="End"
              type="datetime-local"
              value={fields.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Notes (optional)"
            value={fields.notes}
            onChange={(e) => set("notes", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" /> : "Book"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
