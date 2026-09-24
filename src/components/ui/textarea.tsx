import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Fixed small label rendered inside the field's border, above the value. */
  label?: string;
  helper?: string;
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helper, error, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;

    if (!label) {
      return (
        <textarea
          id={textareaId}
          className={cn(
            "flex min-h-[120px] w-full rounded-lg border border-input bg-gates-surface px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted",
            error && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          ref={ref}
          {...props}
        />
      );
    }

    return (
      <div className="flex w-full flex-col gap-1.5">
        <div
          className={cn(
            "flex min-h-[120px] w-full flex-col gap-1 rounded-lg border border-input bg-gates-surface px-4 py-3 ring-offset-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45 has-[:disabled]:bg-muted",
            error && "border-destructive focus-within:border-destructive focus-within:ring-destructive",
            className,
          )}
        >
          <label htmlFor={textareaId} className="text-xs font-medium leading-none text-muted-foreground">
            {label}
          </label>
          <textarea
            id={textareaId}
            className="w-full flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            ref={ref}
            {...props}
          />
        </div>
        {(helper || error) && (
          <p className={cn("text-xs text-muted-foreground", error && "text-destructive")}>
            {error || helper}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
