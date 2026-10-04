/**
 * Optional "document photo" picker for the admin visit sheets. Holds only a
 * File in the parent's state — the upload happens after the visit row exists
 * (see useVisitorManagerData), since the storage path needs the visitor id.
 */

import { useRef } from "react";
import { IconCamera, IconPhoto, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";

interface IdPhotoFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function IdPhotoField({ file, onChange, disabled }: IdPhotoFieldProps) {
  const { t } = useI18n();
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("visitors.idPhoto.label")}</label>
      {/* capture opens the device camera on phones/tablets; desktops fall back to the file picker. */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={disabled}>
          <IconCamera className="mr-1 h-4 w-4" />
          {t("visitors.idPhoto.takePhoto")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={disabled}>
          <IconPhoto className="mr-1 h-4 w-4" />
          {t("visitors.idPhoto.chooseFile")}
        </Button>
      </div>
      {file && (
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("visitors.idPhoto.remove")}
            onClick={() => onChange(null)}
            disabled={disabled}
          >
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("visitors.idPhoto.hint")}</p>
    </div>
  );
}
