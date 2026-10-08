import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-brand-200/60 bg-brand-50 text-brand-700 dark:border-brand-800/40 dark:bg-brand-950/50 dark:text-brand-200",
        brand:
          "border-transparent bg-brand-600 text-white shadow-xs",
        accent:
          "border-accent-200/60 bg-accent-50 text-accent-700 dark:border-accent-800/40 dark:bg-accent-950/50 dark:text-accent-300",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        success:
          "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-300",
        destructive:
          "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
        warning:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
        outline: "text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
