import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Fixed small label rendered inside the input's border, above the value. */
  label?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, id, ...props }, ref) => {
    const generatedId = React.useId();

    if (!label) {
      return (
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border border-input bg-gates-surface px-3.5 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted",
            className,
          )}
          ref={ref}
          {...props}
        />
      );
    }

    const inputId = id ?? generatedId;

    return (
      <div
        className={cn(
          "flex h-16 w-full flex-col justify-center gap-1 rounded-lg border border-input bg-gates-surface px-4 py-3 ring-offset-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:disabled]:bg-muted",
          className,
        )}
      >
        <label htmlFor={inputId} className="text-xs font-medium leading-4 text-muted-foreground">
          {label}
        </label>
        <input
          id={inputId}
          type={type}
          className="w-full border-0 bg-transparent p-0 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);
Input.displayName = "Input";
