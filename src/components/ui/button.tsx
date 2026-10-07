import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-lg text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:min-h-6 [&_svg]:min-w-6",
  {
    variants: {
      variant: {
        default: "border-[1.5px] border-control-border bg-control text-control-foreground hover:bg-control hover:text-control-foreground",
        destructive: "border-[1.5px] border-control-danger bg-control text-control-danger hover:bg-control hover:text-control-danger",
        outline: "border-[1.5px] border-control-border bg-control text-control-foreground hover:bg-control hover:text-control-foreground",
        secondary: "border-[1.5px] border-control-border bg-control text-control-foreground hover:bg-control hover:text-control-foreground",
        ghost: "border-[1.5px] border-control-border bg-control text-control-foreground hover:bg-control hover:text-control-foreground",
        link: "border-[1.5px] border-control-border bg-control text-control-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-14 px-4 py-2",
        sm: "min-h-14 px-3",
        lg: "min-h-14 text-lg px-8",
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
