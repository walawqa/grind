import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background,border-color,color,box-shadow,transform] duration-[var(--dur)] ease-[var(--ease)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-[0_8px_24px_-10px_rgba(139,92,246,0.8),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#7c4ff0]",
        secondary:
          "border border-border bg-surface-2 text-text hover:border-border-strong hover:bg-surface-hover",
        ghost: "text-muted hover:bg-surface-hover hover:text-text",
        outline: "border border-border text-text hover:bg-surface-hover",
      },
      size: {
        sm: "h-8 rounded-[10px] px-3 text-[13px]",
        md: "h-9 rounded-[11px] px-3.5 text-sm",
        lg: "h-11 rounded-xl px-5 text-[15px]",
        icon: "size-9 rounded-[11px]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
