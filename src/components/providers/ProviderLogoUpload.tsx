/**
 * Compact logo picker for a provider row — a square button that opens the
 * native file picker, uploads immediately (provider-logos is a public
 * bucket, no signed URL needed), and reports the resulting public URL back
 * to the caller. Mirrors IconPicker's footprint/placement in the row.
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { IconBuildingStore } from "@tabler/icons-react";
import { Spinner } from "@/components/LoadingStates";
import { providerService } from "@/services";
import { useI18n } from "@/i18n/useI18n";

interface ProviderLogoUploadProps {
  residentialId: string | null;
  value: string | null;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
}

export function ProviderLogoUpload({ residentialId, value, onChange, disabled }: ProviderLogoUploadProps) {
  const { t } = useI18n();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    const result = await providerService.uploadLogo(residentialId, file);
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    onChange(result.data);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled || isUploading}
        aria-label={t("providers.catalog.uploadLogo")}
        onClick={() => inputRef.current?.click()}
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-input bg-gates-surface text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
      >
        {isUploading ? (
          <Spinner size="sm" />
        ) : value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <IconBuildingStore className="h-5 w-5" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </>
  );
}
