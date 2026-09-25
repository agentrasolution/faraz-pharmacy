import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A25E1] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-[#4A25E1] text-white hover:bg-[#3C19CF] shadow-xs hover:shadow",
        default: "bg-[#4A25E1] text-white hover:bg-[#3C19CF] shadow-xs hover:shadow",
        brand: "bg-[#4A25E1] text-white hover:bg-[#3C19CF] shadow-xs hover:shadow",
        cyan: "bg-[#4A25E1] text-white hover:bg-[#3C19CF] shadow-xs font-bold",
        destructive: "bg-danger text-white hover:opacity-90 shadow-xs",
        outline: "border border-border bg-surface hover:bg-surface-2 hover:text-text-primary shadow-xs",
        secondary: "bg-surface-2 text-text-primary hover:bg-border/60",
        ghost: "hover:bg-surface-2 text-text-secondary hover:text-text-primary",
        link: "text-[#4A25E1] dark:text-[#754BFB] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded-lg px-2.5 text-[11px]",
        lg: "h-10 rounded-xl px-5 text-sm",
        xl: "h-12 rounded-2xl px-7 text-sm font-bold",
        icon: "h-9 w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
