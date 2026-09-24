import * as React from "react";
import { IconCheck, IconMinus } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary border-primary" : "bg-muted border-input",
        disabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full bg-gates-surface shadow transition-transform",
          checked ? "translate-x-5 text-primary" : "translate-x-0.5 text-muted-foreground",
        )}
      >
        {checked ? <IconCheck className="h-3 w-3" strokeWidth={3} /> : <IconMinus className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

