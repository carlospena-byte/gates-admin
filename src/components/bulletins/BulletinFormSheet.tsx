/**
 * Create/edit sheet for a bulletin: title, rich-text description, images
 * and PDFs. "Save draft" keeps it hidden from residents; "Publish" makes it
 * visible and (optionally) pushes a notification that opens it in the app.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { BulletinAttachmentsEditor, type AttachmentDraft } from "@/components/bulletins/BulletinAttachmentsEditor";
import { bulletinAttachmentService } from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type { BulletinWithAttachments } from "@/types/bulletin.types";

export interface BulletinFormValues {
  title: string;
  description: string;
  attachments: AttachmentDraft[];
  /** Existing attachments the user removed, to delete on save. */
  removedAttachments: AttachmentDraft[];
  publish: boolean;
  notify: boolean;
}

interface BulletinFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  bulletin: BulletinWithAttachments | null;
  isSubmitting: boolean;
  onSave: (values: BulletinFormValues) => Promise<boolean>;
}

export function BulletinFormSheet({ open, onOpenChange, bulletin, isSubmitting, onSave }: BulletinFormSheetProps) {
  const { t } = useI18n();
  const isEdit = Boolean(bulletin);
  const isPublished = bulletin?.status === "published";

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<AttachmentDraft[]>([]);
  const [notify, setNotify] = useState(true);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const load = async () => {
      setTitleError(false);
      setNotify(true);

      if (!bulletin) {
        setTitle("");
        setDescription("");
        setAttachments([]);
        setOriginalAttachments([]);
        return;
      }

      setIsLoading(true);
      setTitle(bulletin.title);
      setDescription(bulletin.description ?? "");

      const sorted = [...bulletin.bulletin_attachments].sort(
        (a, b) => a.kind.localeCompare(b.kind) || a.sort_order - b.sort_order,
      );
      const drafts: AttachmentDraft[] = await Promise.all(
        sorted.map(async (att) => {
          let previewUrl: string | undefined;
          if (att.kind === "image") {
            const signed = await bulletinAttachmentService.getSignedUrl(att.storage_path);
            if (signed.success) previewUrl = signed.data;
          }
          return { id: att.id, kind: att.kind, name: att.file_name, size: att.file_size, previewUrl, existing: att };
        }),
      );
      if (cancelled) return;
      setAttachments(drafts);
      setOriginalAttachments(drafts);
      setIsLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, bulletin]);

  const handleSubmit = async (publish: boolean) => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    const removedAttachments = originalAttachments.filter((o) => !attachments.some((a) => a.id === o.id));
    const ok = await onSave({
      title: title.trim(),
      description,
      attachments,
      removedAttachments,
      publish,
      notify: publish && notify,
    });
    if (ok) onOpenChange(false);
  };

  const busy = isLoading || isSubmitting;
  // An already-published bulletin saves in place; a draft (or new) one can
  // be saved as draft or published.
  const showNotify = !isPublished && !bulletin?.notified_at;

  return (
    <Sheet open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[640px]">
        <SheetHeader className="border-b px-4 py-4 sm:px-6">
          <SheetTitle>{isEdit ? t("bulletins.form.title.edit") : t("bulletins.form.title.create")}</SheetTitle>
          <SheetDescription>{t("bulletins.form.description")}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="space-y-1.5">
              <Input
                label={t("bulletins.form.titleLabel")}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(false);
                }}
                aria-invalid={titleError}
                disabled={busy}
              />
              {titleError && (
                <p role="alert" className="text-xs text-destructive">
                  {t("bulletins.form.error.titleRequired")}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("bulletins.form.descriptionLabel")}</p>
              <RichTextEditor value={description} onChange={setDescription} disabled={busy} />
            </div>

            <BulletinAttachmentsEditor attachments={attachments} onChange={setAttachments} disabled={busy} />

            {showNotify && (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-input p-3">
                <div>
                  <p className="text-sm font-medium">{t("bulletins.form.notify.label")}</p>
                  <p className="text-xs text-muted-foreground">{t("bulletins.form.notify.hint")}</p>
                </div>
                <Switch checked={notify} onCheckedChange={setNotify} disabled={busy} aria-label={t("bulletins.form.notify.label")} />
              </div>
            )}
          </div>
        )}

        <SheetFooter className="border-t px-4 py-4 sm:px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          {isPublished ? (
            <Button onClick={() => handleSubmit(true)} disabled={busy}>
              {isSubmitting ? <Spinner size="sm" /> : t("bulletins.form.saveChanges")}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleSubmit(false)} disabled={busy}>
                {t("bulletins.form.saveDraft")}
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={busy}>
                {isSubmitting ? <Spinner size="sm" /> : t("bulletins.form.publish")}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
