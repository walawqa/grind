import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#9b74ff] to-[#5b3bd6] shadow-[0_6px_18px_-6px_rgba(139,92,246,0.9),inset_0_1px_0_rgba(255,255,255,0.25)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
        <path
          d="M3 13h3.5l2-5 3.5 9 2.5-6.5 1.5 2.5H21"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[16px] font-semibold tracking-[-0.02em] text-text">
        Resto<span className="text-accent-soft">Pulse</span>
      </span>
    </span>
  );
}
