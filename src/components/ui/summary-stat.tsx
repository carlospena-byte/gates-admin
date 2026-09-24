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
      className={cn("flex flex-col gap-2 rounded-gates-lg bg-gates-surface p-5 shadow-gates-card", className)}
      {...props}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      {status && <p className={cn("text-xs font-medium", toneClasses[statusTone])}>{status}</p>}
    </div>
  );
}
