import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {
  /**
   * Skip the default Portal-to-body. A Radix Dialog/Sheet's trapped
   * FocusScope only recognizes focus targets within its own DOM subtree —
   * a Popover portaled to `document.body` from inside one is a sibling,
   * not a descendant, so the trap treats any focus/click into it as
   * "escaping" and immediately reverts it. Rendering inline (no portal)
   * keeps the content a normal descendant, sidestepping that entirely.
   * Only opt out when this Popover is (or might be) nested inside a Sheet/
   * Dialog — Portal remains the default since it's normally desirable for
   * stacking/overflow clipping.
   */
  portal?: boolean;
}

const PopoverContent = React.forwardRef<React.ElementRef<typeof PopoverPrimitive.Content>, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 4, portal = true, ...props }, ref) => {
    const content = (
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          // pointer-events-auto: a modal Sheet/Dialog sets body { pointer-events: none }
          // while open and re-enables it only on its own content — a Popover portaled
          // from inside one otherwise inherits `none` and becomes unclickable/untypeable.
          "pointer-events-auto z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    );

    return portal ? <PopoverPrimitive.Portal>{content}</PopoverPrimitive.Portal> : content;
  },
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
