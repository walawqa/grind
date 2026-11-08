"use client";

import type { LucideIcon } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useId } from "react";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { NO_DATA } from "@/lib/format";
import { DeltaBadge } from "./delta";

export function KpiCard({
  label,
  value,
  formatted,
  delta,
  icon: Icon,
  definition,
  note,
  spark,
  color = "#A78BFA",
  footer,
  invertDelta,
  comparisonLabel = "vs poprzedni okres",
}: {
  label: string;
  value: number | null;
  formatted: string;
  delta: number | null;
  icon: LucideIcon;
  definition: string;
  note?: string;
  spark?: (number | null)[];
  color?: string;
  footer?: React.ReactNode;
  invertDelta?: boolean;
  comparisonLabel?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const empty = value === null;
  const sparkData = spark?.map((v, i) => ({ i, v }));
  return (
    <Card className="group relative overflow-hidden p-5 transition-[border-color,transform] duration-[var(--dur)] hover:border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-[0.12] blur-2xl transition-opacity duration-300 group-hover:opacity-20"
        style={{ background: color }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-h-10 min-w-0 items-start gap-1">
          <span className="line-clamp-2 text-[13px] font-medium leading-5 text-muted">{label}</span>
          <InfoTip content={definition} label={`Definicja: ${label}`} className="shrink-0" />
        </div>
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-border-subtle bg-bg-elevated/70"
          style={{ color }}
        >
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
      </div>

      <p
        className={cn(
          "tabular mt-2 whitespace-nowrap font-semibold tracking-[-0.03em]",
          empty ? "text-[20px] leading-9 text-subtle" : "text-[28px] leading-9 text-text",
        )}
        title={empty ? note : formatted}
      >
        {empty ? NO_DATA : formatted}
      </p>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {delta !== null ? (
            <>
              <DeltaBadge value={delta} invert={invertDelta} />
              <span className="text-[12px] text-subtle">{comparisonLabel}</span>
            </>
          ) : (
            <span className="text-[12px] leading-snug text-subtle">{note ?? "Brak porównania"}</span>
          )}
        </div>
        {sparkData && !empty ? (
          <div className="h-9 w-24 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
              <AreaChart data={sparkData} margin={{ top: 3, right: 1, bottom: 2, left: 1 }}>
                <defs>
                  <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#spark-${gid})`}
                  isAnimationActive={false}
                  connectNulls
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
      {footer ? <div className="mt-3 border-t border-border-subtle pt-3 text-[12px] text-muted">{footer}</div> : null}
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-8 rounded-[10px]" />
      </div>
      <Skeleton className="mt-4 h-8 w-36" />
      <Skeleton className="mt-3 h-4 w-40" />
    </Card>
  );
}
