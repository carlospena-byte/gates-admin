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
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";
import type { IncidentType } from "@/types/incidentType.types";

export interface NewIncidentFields {
  title: string;
  description: string;
  incidentTypeId: string;
  location: string;
  unitId: string;
}

interface AddIncidentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  incidentTypes: IncidentType[];
  isSubmitting: boolean;
  onCreate: (fields: NewIncidentFields) => Promise<boolean>;
}

const EMPTY: NewIncidentFields = { title: "", description: "", incidentTypeId: "", location: "", unitId: "" };

export function AddIncidentSheet({ open, onOpenChange, units, incidentTypes, isSubmitting, onCreate }: AddIncidentSheetProps) {
  const { t } = useI18n();
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
          <SheetTitle>{t("incidents.create.title")}</SheetTitle>
          <SheetDescription>{t("incidents.create.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label={t("incidents.create.titleLabel")}
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("incidents.create.descriptionLabel")}
            value={fields.description}
            onChange={(e) => set("description", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 grid-cols-1">
            <Select
              value={fields.incidentTypeId || "none"}
              onValueChange={(v) => set("incidentTypeId", v === "none" ? "" : v)}
              disabled={isSubmitting}
            >
              <SelectTrigger label={t("incidents.create.categoryLabel")}>
                <SelectValue placeholder={t("incidents.create.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common.none")}</SelectItem>
                {incidentTypes.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {it.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fields.unitId || "none"} onValueChange={(v) => set("unitId", v === "none" ? "" : v)} disabled={isSubmitting}>
              <SelectTrigger label={t("incidents.create.unitLabel")}>
                <SelectValue placeholder={t("incidents.create.noSpecificUnit")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("incidents.create.noSpecificUnit")}</SelectItem>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            label={t("incidents.create.locationLabel")}
            placeholder={t("incidents.create.locationPlaceholder")}
            value={fields.location}
            onChange={(e) => set("location", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.title.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : t("incidents.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
