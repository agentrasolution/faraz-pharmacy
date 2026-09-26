import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-text-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3612B8]/25 focus-visible:border-[#3612B8] disabled:cursor-not-allowed disabled:opacity-50 shadow-xs transition-all duration-150",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
