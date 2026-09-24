import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface FileUploadProps {
  state?: "empty" | "ready" | "uploading" | "complete" | "error";
  title?: string;
  detail?: string;
  hint?: string;
  progress?: number;
  onChoose?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  className?: string;
}

const stateCopy: Record<NonNullable<FileUploadProps["state"]>, { title: string; detail: string }> = {
  empty: { title: "Adjunta un archivo", detail: "JPG, PNG o PDF · hasta 10 MB" },
  ready: { title: "Archivo listo", detail: "" },
  uploading: { title: "Subiendo…", detail: "" },
  complete: { title: "Archivo adjunto", detail: "" },
  error: { title: "No pudimos subirlo", detail: "Revisa tu conexión e inténtalo de nuevo." },
};

export function FileUpload({
  state = "empty",
  title,
  detail,
  hint,
  progress,
  onChoose,
  onRemove,
  onRetry,
  className,
}: FileUploadProps) {
  const isError = state === "error";
  const isEmpty = state === "empty";
  const copy = stateCopy[state];

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-lg border p-5",
        isError
          ? "border-destructive bg-gates-error-bg"
          : state === "ready"
            ? "border-2 border-ring bg-gates-surface"
            : "border-input bg-gates-surface",
        className,
      )}
    >
      <p className={cn("text-sm font-semibold", isError ? "text-destructive" : "text-foreground")}>
        {title ?? copy.title}
      </p>
      <p className="text-xs text-muted-foreground">{detail ?? copy.detail ?? hint}</p>
      {state === "uploading" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      )}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto justify-start p-0"
        onClick={isError ? onRetry : isEmpty ? onChoose : onRemove}
      >
        {isError ? "Reintentar" : isEmpty ? "Elegir archivo" : "Quitar"}
      </Button>
    </div>
  );
}
