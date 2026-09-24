import * as React from "react";

import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-10 text-xs",
  md: "size-14 text-sm",
  lg: "size-[72px] text-base",
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Full name used to derive initials, e.g. "Ana Torres" -> "AT". */
  name: string;
  size?: keyof typeof sizeClasses;
  /** Shows a small success-colored status dot, e.g. for "online". */
  withStatus?: boolean;
  src?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ name, size = "md", withStatus, src, className, ...props }: AvatarProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)} {...props}>
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full bg-gates-accent font-semibold text-gates-text-brand",
          sizeClasses[size],
        )}
      >
        {src ? (
          <img src={src} alt={name} className="size-full object-cover" />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {withStatus && (
        <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-gates-surface bg-gates-success" />
      )}
    </div>
  );
}
