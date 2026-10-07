import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex min-h-14 min-w-14 items-center justify-center rounded-md border-[1.5px] border-control-border bg-control text-[17px] font-semibold text-control-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed data-[state=on]:bg-control-selected data-[state=on]:text-control-selected-foreground [&_svg]:min-h-6 [&_svg]:min-w-6",
  {
    variants: {
      variant: {
        default: "bg-control",
        outline: "bg-control",
      },
      size: {
        default: "min-h-14 px-3",
        sm: "min-h-14 px-2.5",
        lg: "min-h-14 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
