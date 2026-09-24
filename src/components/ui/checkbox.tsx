import * as React from "react";
import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, label, className, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;

    const control = (
      <button
        ref={ref}
        id={checkboxId}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-gates-surface",
          disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
          className,
        )}
        {...props}
      >
        {checked && <IconCheck size={16} strokeWidth={3} />}
      </button>
    );

    if (!label) return control;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex items-center gap-3 text-sm font-semibold text-foreground",
          disabled && "opacity-45",
        )}
      >
        {control}
        {label}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
