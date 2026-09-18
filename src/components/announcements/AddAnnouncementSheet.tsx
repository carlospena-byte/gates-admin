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
          <SheetTitle>New announcement</SheetTitle>
          <SheetDescription>Saved as a draft — publish it from the list when ready.</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <Input label="Title" value={fields.title} onChange={(e) => set("title", e.target.value)} disabled={isSubmitting} />
          <Input
            label="Content (optional)"
            value={fields.content}
            onChange={(e) => set("content", e.target.value)}
            disabled={isSubmitting}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label="Category (optional)"
              value={fields.category}
              onChange={(e) => set("category", e.target.value)}
              disabled={isSubmitting}
            />
            <Select value={fields.audience} onValueChange={(v) => set("audience", v as AnnouncementAudience)} disabled={isSubmitting}>
              <SelectTrigger label="Audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="admins">Admins only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            label="Publish at (optional — leave blank to publish immediately when you hit Publish)"
            type="datetime-local"
            value={fields.publishAt}
            onChange={(e) => set("publishAt", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isSubmitting || !fields.title.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : "Save draft"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
