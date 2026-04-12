import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#701a75]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-violet-500/80 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#701a75] text-white shadow-md shadow-[#701a75]/25 hover:bg-[#5c165f] active:scale-[0.98] dark:bg-violet-600 dark:shadow-violet-900/30 dark:hover:bg-violet-500",
        outline:
          "border border-zinc-300 bg-white text-zinc-800 shadow-sm hover:border-[#701a75]/35 hover:bg-[#fff5f7] dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:hover:border-violet-500/40 dark:hover:bg-white/10",
        ghost:
          "border border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
        secondary:
          "border border-[#701a75]/25 bg-[#701a75]/10 text-[#701a75] hover:bg-[#701a75]/15 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "h-10 w-10",
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
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          "ring-offset-white dark:ring-offset-zinc-950",
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
