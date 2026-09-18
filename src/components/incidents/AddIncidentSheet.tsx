/**
 * Right-side sheet for reporting a new incident — title, description,
 * category, unit, location. Mirrors AddVisitorSheet's create-form shape.
 * Priority/status/assignment are triaged afterwards by an admin in
 * IncidentDetailSheet, not set at creation time.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import type { UnitWithOwner } from "@/services";

export interface NewIncidentFields {
  title: string;
  description: string;
  category: string;
  location: string;
  unitId: string;
}

interface AddIncidentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  isSubmitting: boolean;
  onCreate: (fields: NewIncidentFields) => Promise<boolean>;
}

const CATEGORIES = ["Maintenance", "Security", "Noise", "Cleanliness", "Other"];

const EMPTY: NewIncidentFields = { title: "", description: "", category: "", location: "", unitId: "" };

export function AddIncidentSheet({ open, onOpenChange, units, isSubmitting, onCreate }: AddIncidentSheetProps) {
  const [fields, setFields] = useState<NewIncidentFields>(EMPTY);
  const set = <K extends keyof NewIncidentFields>(key: K, value: NewIncidentFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setFields(EMPTY);
    onOpenChange(nextOpen);
  };

  const handleAdd = async () => {
    if (!fields.title.trim()) return;
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
          <SheetTitle>Report an incident</SheetTitle>
          <SheetDescription>Describe the problem — an admin will triage it.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label="Title"
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Description (optional)"
            value={fields.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={fields.category || "none"} onValueChange={(v) => set("category", v === "none" ? "" : v)} disabled={isSubmitting}>
              <SelectTrigger label="Category (optional)">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fields.unitId || "none"} onValueChange={(v) => set("unitId", v === "none" ? "" : v)} disabled={isSubmitting}>
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
          </div>

          <Input
            label="Location (optional)"
            placeholder="e.g., Parking level 1"
            value={fields.location}
            onChange={(e) => set("location", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.title.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : "Report incident"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
