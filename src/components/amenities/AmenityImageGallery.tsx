/**
 * Image gallery editor for the amenity form. Works entirely on a local
 * draft (existing images loaded as previews + newly chosen files not yet
 * uploaded), same "commit on submit, discard on cancel" spirit as
 * AddAddonSheet's pendingIds draft — actual upload/delete/setPrimary calls
 * happen in AmenityFormSheet's submit handler, not here.
 */

import { useRef } from "react";
import { IconPlus, IconStar, IconStarFilled, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";

export interface GalleryImageDraft {
  /** Existing amenity_images.id, or a client-only id (prefixed "new-") for a not-yet-uploaded file. */
  id: string;
  /** Signed URL (existing image) or an object URL preview (newly chosen file). */
  previewUrl: string;
  /** Present only for a newly chosen file that still needs to be uploaded on submit. */
  file?: File;
  isPrimary: boolean;
}

interface AmenityImageGalleryProps {
  images: GalleryImageDraft[];
  onChange: (images: GalleryImageDraft[]) => void;
  disabled?: boolean;
}

export function AmenityImageGallery({ images, onChange, disabled }: AmenityImageGalleryProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFilesChosen = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const additions: GalleryImageDraft[] = Array.from(files).map((file, i) => ({
      id: `new-${Date.now()}-${i}`,
      previewUrl: URL.createObjectURL(file),
      file,
      isPrimary: false,
    }));
    const next = [...images, ...additions];
    // First image added ever becomes primary by default.
    if (!next.some((img) => img.isPrimary) && next.length > 0) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  const setPrimary = (id: string) => {
    onChange(images.map((img) => ({ ...img, isPrimary: img.id === id })));
  };

  const remove = (id: string) => {
    const removed = images.find((img) => img.id === id);
    const next = images.filter((img) => img.id !== id);
    if (removed?.isPrimary && next.length > 0) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {images.map((img) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border border-input">
            <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-1 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <button
                type="button"
                aria-label={img.isPrimary ? t("amenities.gallery.primaryLabel") : t("amenities.gallery.setPrimaryLabel")}
                disabled={disabled}
                onClick={() => setPrimary(img.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-amber-500 disabled:cursor-not-allowed"
              >
                {img.isPrimary ? <IconStarFilled className="h-4 w-4" /> : <IconStar className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label={t("amenities.gallery.removeLabel")}
                disabled={disabled}
                onClick={() => remove(img.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-destructive disabled:cursor-not-allowed"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>
            {img.isPrimary && (
              <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {t("amenities.gallery.primaryBadge")}
              </span>
            )}
          </div>
        ))}

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45",
          )}
        >
          <IconPlus className="h-5 w-5" />
          <span className="text-xs">{t("common.add")}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesChosen(e.target.files);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-muted-foreground">{t("amenities.gallery.hint")}</p>
    </div>
  );
}
