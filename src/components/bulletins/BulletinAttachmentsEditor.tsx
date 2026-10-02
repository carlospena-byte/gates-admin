/**
 * Images + PDFs editor for the bulletin form. Works on a local draft
 * (existing attachments plus newly chosen files not yet uploaded), same
 * "commit on submit" approach as AmenityImageGallery — the actual
 * upload/delete calls happen in useBulletinManagerData.saveBulletin.
 */

import { useRef } from "react";
import { toast } from "sonner";
import { IconFileTypePdf, IconPlus, IconX } from "@tabler/icons-react";
import { useI18n } from "@/i18n/useI18n";
import type { BulletinAttachment, BulletinAttachmentKind } from "@/types/bulletin.types";

export const MAX_BULLETIN_IMAGES = 10;
export const MAX_BULLETIN_PDFS = 5;
/** Matches the bucket's file_size_limit (10 MB). */
export const MAX_BULLETIN_FILE_BYTES = 10 * 1024 * 1024;

export interface AttachmentDraft {
  /** Existing bulletin_attachments.id, or a client-only "new-…" id for a not-yet-uploaded file. */
  id: string;
  kind: BulletinAttachmentKind;
  name: string;
  size: number | null;
  /** Signed URL (existing image) or object URL (new image); unused for PDFs. */
  previewUrl?: string;
  /** Present only for a newly chosen file. */
  file?: File;
  /** Present only for an already-stored attachment. */
  existing?: BulletinAttachment;
}

interface BulletinAttachmentsEditorProps {
  attachments: AttachmentDraft[];
  onChange: (attachments: AttachmentDraft[]) => void;
  disabled?: boolean;
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BulletinAttachmentsEditor({ attachments, onChange, disabled }: BulletinAttachmentsEditorProps) {
  const { t } = useI18n();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const images = attachments.filter((a) => a.kind === "image");
  const pdfs = attachments.filter((a) => a.kind === "pdf");

  const addFiles = (list: FileList | null, kind: BulletinAttachmentKind) => {
    const incoming = Array.from(list ?? []);
    if (incoming.length === 0) return;

    const max = kind === "image" ? MAX_BULLETIN_IMAGES : MAX_BULLETIN_PDFS;
    const current = kind === "image" ? images.length : pdfs.length;
    const accepted: AttachmentDraft[] = [];

    for (const file of incoming) {
      const typeOk = kind === "image" ? file.type.startsWith("image/") : file.type === "application/pdf";
      if (!typeOk) {
        toast.error(t("bulletins.form.error.invalidFile", { name: file.name }));
        continue;
      }
      if (file.size > MAX_BULLETIN_FILE_BYTES) {
        toast.error(t("bulletins.form.error.fileTooLarge", { name: file.name }));
        continue;
      }
      if (current + accepted.length >= max) {
        toast.error(t(kind === "image" ? "bulletins.form.error.tooManyImages" : "bulletins.form.error.tooManyPdfs", { max }));
        break;
      }
      accepted.push({
        id: `new-${Date.now()}-${accepted.length}-${file.name}`,
        kind,
        name: file.name,
        size: file.size,
        file,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
      });
    }

    if (accepted.length > 0) onChange([...attachments, ...accepted]);
  };

  const remove = (id: string) => {
    const removed = attachments.find((a) => a.id === id);
    if (removed?.file && removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("bulletins.form.imagesLabel")} ({images.length}/{MAX_BULLETIN_IMAGES})
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-input">
              {img.previewUrl ? <img src={img.previewUrl} alt={img.name} className="h-full w-full object-cover" /> : null}
              <button
                type="button"
                aria-label={t("bulletins.form.removeAttachment", { name: img.name })}
                disabled={disabled}
                onClick={() => remove(img.id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-destructive disabled:cursor-not-allowed"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
          ))}
          {images.length < MAX_BULLETIN_IMAGES && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => imageInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              <IconPlus className="h-5 w-5" />
              <span className="text-xs">{t("bulletins.form.addImage")}</span>
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{t("bulletins.form.imagesHint")}</p>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, "image");
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          {t("bulletins.form.pdfsLabel")} ({pdfs.length}/{MAX_BULLETIN_PDFS})
        </p>
        {pdfs.length > 0 && (
          <ul className="space-y-2">
            {pdfs.map((pdf) => (
              <li key={pdf.id} className="flex items-center gap-3 rounded-lg border border-input px-3 py-2">
                <IconFileTypePdf className="h-5 w-5 shrink-0 text-destructive" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{pdf.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(pdf.size)}</p>
                </div>
                <button
                  type="button"
                  aria-label={t("bulletins.form.removeAttachment", { name: pdf.name })}
                  disabled={disabled}
                  onClick={() => remove(pdf.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent disabled:cursor-not-allowed"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {pdfs.length < MAX_BULLETIN_PDFS && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => pdfInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input px-3 py-3 text-sm text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            <IconPlus className="h-4 w-4" />
            {t("bulletins.form.addPdf")}
          </button>
        )}
        <p className="text-xs text-muted-foreground">{t("bulletins.form.pdfsHint")}</p>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files, "pdf");
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
