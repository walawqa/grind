"use client";

import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  className,
  align = "end",
  ...props
}: P.PopoverContentProps) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-50 min-w-[220px] rounded-2xl border border-border bg-[#0f1729]/95 p-1.5 shadow-[var(--shadow-pop)] backdrop-blur-xl fade-up",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}

export function MenuItem({
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13.5px] transition-colors duration-150",
        active ? "bg-[var(--accent-bg)] text-text" : "text-muted hover:bg-surface-hover hover:text-text",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
