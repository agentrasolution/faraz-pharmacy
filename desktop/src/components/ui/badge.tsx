import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20",
  {
    variants: {
      variant: {
        default: "bg-brand/10 text-brand border border-brand/20",
        brand: "bg-brand/10 text-brand border border-brand/20",
        cyan: "bg-brand/10 text-brand border border-brand/20",
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        danger: "bg-danger/10 text-danger border border-danger/20",
        outline: "text-text-secondary border border-border/80 bg-surface",
        neutral: "bg-surface-2 text-text-secondary border border-border/60",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
