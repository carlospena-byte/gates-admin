/**
 * Right-side sheet for drafting a new announcement — title, content,
 * category, audience, and an optional future publish_at ("scheduling" is
 * just publishing with a future timestamp, see the migration). Always
 * created as a draft; publishing happens from the table.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { AnnouncementAudience } from "@/types/announcement.types";

export interface NewAnnouncementFields {
  title: string;
  content: string;
  category: string;
  audience: AnnouncementAudience;
  publishAt: string;
}

interface AddAnnouncementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onCreate: (fields: NewAnnouncementFields) => Promise<boolean>;
}

const EMPTY: NewAnnouncementFields = { title: "", content: "", category: "", audience: "everyone", publishAt: "" };

export function AddAnnouncementSheet({ open, onOpenChange, isSubmitting, onCreate }: AddAnnouncementSheetProps) {
  const { t } = useI18n();
  const [fields, setFields] = useState<NewAnnouncementFields>(EMPTY);
  const set = <K extends keyof NewAnnouncementFields>(key: K, value: NewAnnouncementFields[K]) =>
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
          <SheetTitle>{t("announcements.create.title")}</SheetTitle>
          <SheetDescription>{t("announcements.create.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input
            label={t("announcements.create.titleLabel")}
            value={fields.title}
            onChange={(e) => set("title", e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label={t("announcements.create.contentLabel")}
            value={fields.content}
            onChange={(e) => set("content", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 grid-cols-1">
            <Input
              label={t("announcements.create.categoryLabel")}
              value={fields.category}
              onChange={(e) => set("category", e.target.value)}
              disabled={isSubmitting}
            />
            <Select value={fields.audience} onValueChange={(v) => set("audience", v as AnnouncementAudience)} disabled={isSubmitting}>
              <SelectTrigger label={t("announcements.create.audienceLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">{t("announcements.audience.everyone")}</SelectItem>
                <SelectItem value="admins">{t("announcements.audience.admins")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label={t("announcements.create.publishAtLabel")}
            type="datetime-local"
            value={fields.publishAt}
            onChange={(e) => set("publishAt", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.title.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : t("announcements.create.submit")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
