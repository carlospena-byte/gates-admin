/**
 * Right-side sheet for creating a new rental period for a unit — the
 * ongoing monthly tenant or a short-term stay. Mirrors AddResidentSheet's
 * create-form-in-a-sheet shape.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import type { RentalType } from "@/types/unit-wizard.types";

export interface NewRentalFields {
  rentalType: RentalType;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  startDate: string;
  endDate: string;
  price: string;
}

interface AddRentalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (fields: NewRentalFields) => Promise<boolean>;
}

const EMPTY: NewRentalFields = {
  rentalType: "monthly",
  tenantName: "",
  tenantEmail: "",
  tenantPhone: "",
  startDate: "",
  endDate: "",
  price: "",
};

export function AddRentalSheet({ open, onOpenChange, isSubmitting, onCreate }: AddRentalSheetProps) {
  const [fields, setFields] = useState<NewRentalFields>(EMPTY);
  const set = <K extends keyof NewRentalFields>(key: K, value: NewRentalFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(EMPTY);
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!fields.tenantName.trim() || !fields.startDate) return;
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
          <SheetTitle>Add rental</SheetTitle>
          <SheetDescription>Who&apos;s responsible for this unit, or a short-term stay.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={fields.rentalType}
              onValueChange={(v) => set("rentalType", v as RentalType)}
              disabled={isSubmitting}
            >
              <SelectTrigger label="Rental Type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly (responsible tenant)</SelectItem>
                <SelectItem value="short_term">Short-term (Airbnb-style)</SelectItem>
              </SelectContent>
            </Select>
            <Input
              label="Price (optional)"
              type="number"
              min="0"
              step="0.01"
              value={fields.price}
              onChange={(e) => set("price", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <Input
            label="Tenant / Guest Name"
            value={fields.tenantName}
            onChange={(e) => set("tenantName", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Email (optional)"
              type="email"
              value={fields.tenantEmail}
              onChange={(e) => set("tenantEmail", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="Phone (optional)"
              value={fields.tenantPhone}
              onChange={(e) => set("tenantPhone", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Start Date"
              type="date"
              value={fields.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              disabled={isSubmitting}
            />
            <Input
              label="End Date (optional)"
              type="date"
              value={fields.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.tenantName.trim() || !fields.startDate}>
            {isSubmitting ? <Spinner size="sm" /> : "Add rental"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
