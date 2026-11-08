"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

export function InfoTip({
  content,
  className,
  label = "Wyjaśnienie",
}: {
  content: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <Tooltip.Root delayDuration={150}>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex size-5 items-center justify-center rounded-full text-subtle transition-colors hover:text-muted",
            className,
          )}
        >
          <Info className="size-3.5" />
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-[280px] rounded-xl border border-border bg-[#0f1729] px-3 py-2 text-[12.5px] leading-relaxed text-muted shadow-[var(--shadow-pop)] fade-up"
        >
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
