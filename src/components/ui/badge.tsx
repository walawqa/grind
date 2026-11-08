import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-5 [&_svg]:size-3",
  {
    variants: {
      tone: {
        positive: "bg-[var(--positive-bg)] text-positive",
        negative: "bg-[var(--negative-bg)] text-negative",
        warning: "bg-[var(--warning-bg)] text-warning",
        accent: "bg-[var(--accent-bg)] text-accent-soft",
        neutral: "bg-surface-3 text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
