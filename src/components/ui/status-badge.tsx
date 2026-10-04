import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-gates-success-bg text-gates-success",
  warning: "bg-gates-warning-bg text-gates-warning",
  error: "bg-gates-error-bg text-gates-error",
  info: "bg-gates-info-bg text-gates-text-brand",
  neutral: "bg-secondary text-secondary-foreground",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  /** Hide the leading dot (e.g. for secondary attributes like priority). */
  hideDot?: boolean;
}

/**
 * Shared status pill. Every status tag in the admin must go through this so
 * colors stay in sync with the Gates palette (semantic tokens in index.css).
 */
function StatusBadge({ tone, hideDot, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {!hideDot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { StatusBadge };
