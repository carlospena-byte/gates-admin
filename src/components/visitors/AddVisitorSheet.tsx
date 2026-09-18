/**
 * Right-side sheet for scheduling a new visitor — name, phone, plate, unit,
 * and a valid_from/valid_until window. Mirrors AddRentalSheet's
 * create-form-in-a-sheet shape.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import type { UnitWithOwner } from "@/services";

export interface NewVisitorFields {
  name: string;
  phone: string;
  plate: string;
  unitId: string;
  validFrom: string;
  validUntil: string;
}

interface AddVisitorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  isSubmitting: boolean;
  onCreate: (fields: NewVisitorFields) => Promise<boolean>;
}

/** Formats a Date as the "YYYY-MM-DDTHH:mm" value a datetime-local input expects, in local time. */
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultFields(): NewVisitorFields {
  const now = new Date();
  const later = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return {
    name: "",
    phone: "",
    plate: "",
    unitId: "",
    validFrom: toDatetimeLocalValue(now),
    validUntil: toDatetimeLocalValue(later),
  };
}

export function AddVisitorSheet({ open, onOpenChange, units, isSubmitting, onCreate }: AddVisitorSheetProps) {
  const [fields, setFields] = useState<NewVisitorFields>(defaultFields);
  const set = <K extends keyof NewVisitorFields>(key: K, value: NewVisitorFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(defaultFields());
    onOpenChange(nextOpen);
  };

  const isValid = fields.name.trim() && fields.validFrom && fields.validUntil;

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
          <SheetTitle>Add visitor</SheetTitle>
          <SheetDescription>Schedule someone to be let in during a time window.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label="Visitor Name"
            value={fields.name}
            onChange={(e) => set("name", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Phone (optional)"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Plate (optional)"
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
            <SelectTrigger label="Unit (optional)">
              <SelectValue placeholder="No specific unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific unit</SelectItem>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Valid From"
              type="datetime-local"
              value={fields.validFrom}
              onChange={(e) => set("validFrom", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Valid Until"
              type="datetime-local"
              value={fields.validUntil}
              onChange={(e) => set("validUntil", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !isValid}>
            {isSubmitting ? <Spinner size="sm" /> : "Add visitor"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
