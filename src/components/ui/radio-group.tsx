import * as React from "react";

import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function RadioGroup({ value, onValueChange, disabled, className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
      <div role="radiogroup" className={cn("flex flex-col gap-2", className)} {...props} />
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
  value: string;
  label?: React.ReactNode;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, label, className, id, disabled, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const generatedId = React.useId();
    const itemId = id ?? generatedId;
    const checked = ctx?.value === value;
    const isDisabled = disabled ?? ctx?.disabled;

    const control = (
      <button
        ref={ref}
        id={itemId}
        type="button"
        role="radio"
        aria-checked={checked}
        disabled={isDisabled}
        onClick={() => ctx?.onValueChange(value)}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "border-primary" : "border-input bg-gates-surface",
          isDisabled ? "opacity-45 cursor-not-allowed" : "cursor-pointer",
          className,
        )}
        {...props}
      >
        {checked && <span className="size-3 rounded-full bg-primary" />}
      </button>
    );

    if (!label) return control;

    return (
      <label
        htmlFor={itemId}
        className={cn(
          "flex items-center gap-3 text-sm font-semibold text-foreground",
          isDisabled && "opacity-45",
        )}
      >
        {control}
        {label}
      </label>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";
