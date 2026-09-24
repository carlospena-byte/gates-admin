import * as React from "react";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface SelectableCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  mode?: "single" | "multiple";
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  label: string;
  title: string;
  description?: string;
  meta?: string;
}

export const SelectableCard = React.forwardRef<HTMLButtonElement, SelectableCardProps>(
  (
    { mode = "single", selected, onSelectedChange, label, title, description, meta, className, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onSelectedChange(!selected)}
        className={cn(
          "flex w-full flex-col gap-2 rounded-gates-lg border p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected ? "border-2 border-ring bg-gates-accent" : "border-input bg-gates-surface",
          disabled && "cursor-not-allowed opacity-45",
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-3">
          <span className="flex-1 text-xs font-medium text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center border",
              mode === "single" ? "rounded-full" : "rounded-md",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-gates-surface",
            )}
          >
            {selected && <IconCheck size={14} strokeWidth={3} />}
          </span>
        </div>
        <p className="text-xl font-semibold leading-tight text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {meta && <p className="text-xs font-medium text-gates-text-brand">{meta}</p>}
      </button>
    );
  },
);
SelectableCard.displayName = "SelectableCard";
