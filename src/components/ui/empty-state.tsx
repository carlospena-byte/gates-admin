import * as React from "react";
import { IconAlertTriangle, IconLoader2, IconPlus } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "empty" | "error" | "loading";
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ type = "empty", title, description, action, className, ...props }: EmptyStateProps) {
  const isError = type === "error";
  const isLoading = type === "loading";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-gates-lg bg-gates-surface px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          isError ? "bg-gates-error-bg text-gates-error" : "bg-gates-accent text-gates-text-brand",
        )}
      >
        {isLoading ? (
          <IconLoader2 size={24} className="animate-spin" />
        ) : isError ? (
          <IconAlertTriangle size={24} />
        ) : (
          <IconPlus size={24} />
        )}
      </div>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && !isLoading && <div className="mt-1">{action}</div>}
    </div>
  );
}
