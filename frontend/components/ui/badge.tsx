import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Flat, data-dense badges — no glows or heavy shadows */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-[#701a75]/35 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-violet-500/40 dark:focus:ring-offset-zinc-950",
  {
    variants: {
      variant: {
        default:
          "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300",
        success:
          "border-emerald-800 bg-emerald-800 text-white",
        warning:
          "border-amber-800 bg-amber-800 text-white",
        danger:
          "border-red-800 bg-red-800 text-white",
        muted:
          "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
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
