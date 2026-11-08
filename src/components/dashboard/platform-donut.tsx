"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent, formatPLN } from "@/lib/format";
import type { PlatformRow } from "@/lib/kpi";
import { PLATFORMS } from "@/lib/platforms";
import { ChartTooltipBox } from "./chart-tooltip";

export function PlatformDonut({ rows, total }: { rows: PlatformRow[]; total: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const data = rows.filter((r) => r.sales > 0);
  const focused = hover !== null ? data[hover] : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Udział platform" subtitle="Udział w sprzedaży w wybranym okresie" />
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-subtle">Brak danych</div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4 px-5 pb-5 pt-2">
          <div className="relative mx-auto size-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="sales"
                  nameKey="platform"
                  innerRadius="72%"
                  outerRadius="96%"
                  paddingAngle={2.5}
                  cornerRadius={6}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                  onMouseEnter={(_, i) => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  animationDuration={500}
                >
                  {data.map((r, i) => (
                    <Cell
                      key={r.platform}
                      fill={PLATFORMS[r.platform].color}
                      opacity={hover === null || hover === i ? 1 : 0.35}
                      style={{ transition: "opacity 180ms" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as PlatformRow;
                    return (
                      <ChartTooltipBox
                        title={PLATFORMS[r.platform].label}
                        rows={[
                          { label: "Sprzedaż", value: formatPLN(r.sales), color: PLATFORMS[r.platform].color },
                          { label: "Udział", value: formatPercent(r.share) },
                          { label: "Zamówienia", value: formatInt(r.orders) },
                        ]}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-subtle">
                {focused ? PLATFORMS[focused.platform].label : "Łącznie"}
              </span>
              <span className="tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em] text-text">
                {formatPLN(focused ? focused.sales : total, { compact: true })}
              </span>
              {focused ? <span className="text-[12px] text-muted">{formatPercent(focused.share)}</span> : null}
            </div>
          </div>
          <ul className="flex flex-col gap-1">
            {data.map((r, i) => (
              <li
                key={r.platform}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "flex items-center gap-3 rounded-[10px] px-2 py-1.5 text-[13px] transition-colors",
                  hover === i && "bg-surface-hover",
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: PLATFORMS[r.platform].color }} />
                <span className="flex-1 text-muted">{PLATFORMS[r.platform].label}</span>
                <span className="tabular text-subtle">{formatPLN(r.sales, { compact: true })}</span>
                <span className="tabular w-12 text-right font-medium text-text">{formatPercent(r.share, 0)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
