import { AlertTriangle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Insight } from "@/lib/insights";

const TONE = {
  positive: { icon: TrendingUp, cls: "text-positive bg-[var(--positive-bg)]" },
  negative: { icon: TrendingDown, cls: "text-negative bg-[var(--negative-bg)]" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-[var(--warning-bg)]" },
  neutral: { icon: Minus, cls: "text-cyan bg-[rgba(34,211,238,0.1)]" },
} as const;

export function InsightItem({ insight, showBasis = false }: { insight: Insight; showBasis?: boolean }) {
  const t = TONE[insight.tone];
  const Icon = t.icon;
  return (
    <div className="flex gap-3">
      <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px]", t.cls)}>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium leading-snug text-text">{insight.title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{insight.detail}</p>
        {showBasis ? <p className="mt-1.5 text-[12px] text-subtle">Podstawa: {insight.basis}</p> : null}
      </div>
    </div>
  );
}
