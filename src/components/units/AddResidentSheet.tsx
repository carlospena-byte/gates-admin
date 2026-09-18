/**
 * Right-side sheet for adding a resident to a unit — name, email, phone.
 * Mirrors AddonItemEditSheet's create-form-in-a-sheet shape so the flow
 * matches how add-ons and rentals are added.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";

export interface NewResidentFields {
  fullName: string;
  email: string;
  phone: string;
}

interface AddResidentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (fields: NewResidentFields) => Promise<boolean>;
}

const EMPTY: NewResidentFields = { fullName: "", email: "", phone: "" };

export function AddResidentSheet({ open, onOpenChange, isSubmitting, onCreate }: AddResidentSheetProps) {
  const [fields, setFields] = useState<NewResidentFields>(EMPTY);
  const set = <K extends keyof NewResidentFields>(key: K, value: NewResidentFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(EMPTY);
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!fields.fullName.trim() || !fields.email.trim()) return;
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
          <SheetTitle>Add resident</SheetTitle>
          <SheetDescription>Add someone authorized to live in this unit.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label="Full Name"
            value={fields.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Email"
            type="email"
            value={fields.email}
            onChange={(e) => set("email", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Phone (optional)"
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.fullName.trim() || !fields.email.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : "Add resident"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
