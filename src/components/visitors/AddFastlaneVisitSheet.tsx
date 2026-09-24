/**
 * Right-side sheet for FastLane: schedule a visit with no name captured yet
 * — the visitor self-registers via the link this sheet sends them. After
 * creation the form is replaced by a confirmation view showing the link
 * (with a "resend" button), since access_code/link don't change afterward.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { UnitWithOwner } from "@/services";
import type { NotificationChannel, VisitorWithInviter } from "@/types/visitor.types";

const NOTES_MAX_LENGTH = 120;

export interface NewFastlaneVisitFields {
  unitId: string;
  phone: string;
  visitDate: string; // "YYYY-MM-DD"
  channel: NotificationChannel;
  notes: string;
}

interface AddFastlaneVisitSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithOwner[];
  isSubmitting: boolean;
  /** Returns the created row so the sheet can show the link + a resend button. */
  onCreate: (fields: NewFastlaneVisitFields) => Promise<VisitorWithInviter | null>;
  onResend: (visitId: string, channel: NotificationChannel) => Promise<{ notificationSent: boolean; error?: string; link?: string }>;
}

function toDateValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultFields(): NewFastlaneVisitFields {
  return {
    unitId: "",
    phone: "",
    visitDate: toDateValue(new Date()),
    channel: "whatsapp",
    notes: "",
  };
}

export function AddFastlaneVisitSheet({ open, onOpenChange, units, isSubmitting, onCreate, onResend }: AddFastlaneVisitSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewFastlaneVisitFields>(defaultFields);
  const [created, setCreated] = useState<VisitorWithInviter | null>(null);
  const [sendResult, setSendResult] = useState<{ notificationSent: boolean; error?: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  const set = <K extends keyof NewFastlaneVisitFields>(key: K, value: NewFastlaneVisitFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFields(defaultFields());
      setCreated(null);
      setSendResult(null);
    }
    onOpenChange(nextOpen);
  };

  const isValid = fields.unitId.length > 0 && fields.phone.trim().length > 0 && fields.visitDate.length > 0;

  const handleAdd = async () => {
    if (!isValid) return;
    const visitor = await onCreate(fields);
    if (!visitor) return;
    setCreated(visitor);
    const result = await onResend(visitor.id, fields.channel);
    setSendResult(result);
  };

  const handleResend = async () => {
    if (!created) return;
    setIsResending(true);
    const result = await onResend(created.id, fields.channel);
    setSendResult(result);
    setIsResending(false);
  };

  if (created) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("visitors.fastlane.createdTitle")}</SheetTitle>
            <SheetDescription>{t("visitors.fastlane.createdDescription")}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="font-medium">{t("visitors.fastlane.codeLabel")}</div>
              <div className="mt-1 font-mono text-lg tracking-wider">{created.access_code}</div>
            </div>

            {sendResult && !sendResult.notificationSent && (
              <p className="text-sm text-red-600">{sendResult.error ?? t("visitors.fastlane.sendFailed")}</p>
            )}
            {sendResult?.notificationSent && (
              <p className="text-sm text-gates-text-brand">{t("visitors.fastlane.sendSuccess")}</p>
            )}

            <Button variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
              {isResending ? <Spinner size="sm" /> : t("visitors.fastlane.resend")}
            </Button>
          </div>

          <SheetFooter>
            <Button onClick={() => handleOpenChange(false)}>{t("common.close")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("visitors.fastlane.title")}</SheetTitle>
          <SheetDescription>{t("visitors.fastlane.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Select value={fields.unitId} onValueChange={(value) => set("unitId", value)} disabled={isSubmitting}>
            <SelectTrigger label={t("visitors.fastlane.unitLabel")}>
              <SelectValue placeholder={t("visitors.fastlane.selectUnit")} />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            label={t("visitors.fastlane.phoneLabel")}
            value={fields.phone}
            onChange={(e) => set("phone", e.target.value)}
            disabled={isSubmitting}
          />

          <Input
            label={t("visitors.delivery.dateLabel")}
            type="date"
            value={fields.visitDate}
            onChange={(e) => set("visitDate", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="space-y-1.5">
            <div className="text-sm font-medium">{t("visitors.fastlane.channelLabel")}</div>
            <RadioGroup value={fields.channel} onValueChange={(value) => set("channel", value as NotificationChannel)} disabled={isSubmitting}>
              <RadioGroupItem value="whatsapp" label="WhatsApp" />
              <RadioGroupItem value="sms" label="SMS" />
            </RadioGroup>
          </div>

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
            {isSubmitting ? <Spinner size="sm" /> : t("visitors.fastlane.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
