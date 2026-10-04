import * as React from "react";

import { cn } from "@/lib/utils";

export interface SummaryStatProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string;
  detail?: string;
  status?: string;
  statusTone?: "success" | "warning" | "error" | "muted" | "brand";
}

const toneClasses = {
  success: "text-gates-success",
  warning: "text-gates-warning",
  error: "text-gates-error",
  muted: "text-muted-foreground",
  brand: "text-gates-text-brand",
} as const;

export function SummaryStat({ title, value, detail, status, statusTone = "muted", className, ...props }: SummaryStatProps) {
  return (
    <div
      className={cn("flex flex-col gap-2 rounded-gates-lg border border-border bg-gates-surface p-4 sm:p-5", className)}
      {...props}
    >
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</p>
      {detail && <p className="text-sm leading-snug text-muted-foreground">{detail}</p>}
      {status && (
        <p className={cn("flex items-center gap-1.5 text-xs font-semibold", toneClasses[statusTone])}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {status}
        </p>
      )}
    </div>
  );
}
