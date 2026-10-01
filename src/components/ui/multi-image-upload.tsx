import { useRef, useState } from "react";
import { IconCloudUpload, IconPhoto, IconTrash, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface UploadItem {
  id: string;
  name: string;
  /** Bytes; omitted for files whose size is unknown (already stored). */
  size?: number;
  status: "uploaded" | "uploading";
  /** Local object URL used as thumbnail while/after uploading. */
  previewUrl?: string;
}

export interface MultiImageUploadProps {
  items: UploadItem[];
  max: number;
  title: string;
  hint: string;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onView?: (id: string) => void;
  /** Called when files are dropped/picked beyond the remaining slots. */
  onLimitExceeded?: () => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

function formatSize(bytes?: number) {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Drag-and-drop area plus a row per file, capped at `max` items. */
export function MultiImageUpload({
  items,
  max,
  title,
  hint,
  onFiles,
  onRemove,
  onView,
  onLimitExceeded,
  accept = "image/*",
  disabled,
  className,
}: MultiImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const remaining = max - items.length;
  const isFull = remaining <= 0;
  const isDisabled = disabled || isFull;

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    if (files.length > remaining) onLimitExceeded?.();
    if (remaining > 0) onFiles(files.slice(0, remaining));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isDisabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          isDragging ? "border-ring bg-muted" : "border-input bg-gates-surface hover:bg-muted/50",
          isDisabled && "cursor-not-allowed opacity-60 hover:bg-gates-surface",
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">
          <IconCloudUpload className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </button>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-input bg-background p-2">
              <button
                type="button"
                disabled={item.status === "uploading" || !onView}
                onClick={() => onView?.(item.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted"
              >
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <IconPhoto className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                {item.size != null && <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>}
                {item.status === "uploading" && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
                  </div>
                )}
              </div>
              {item.status === "uploaded" && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemove(item.id)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                  aria-label="Delete"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
              {item.status === "uploading" && <IconX className="mr-2 h-4 w-4 text-muted-foreground" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
