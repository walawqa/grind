"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { formatAxisPLN, formatDayMonth, formatPLN, formatWeekdayDate } from "@/lib/format";
import { PLATFORMS } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";
import { ChartTooltipBox } from "./chart-tooltip";

type Row = Record<string, number | string | null>;

/** Dzienna sprzedaż per platforma. Przy zakresach > 31 dni wygładzamy średnią kroczącą 7-dniową. */
export function PlatformTrendChart({ data, platforms }: { data: Row[]; platforms: PlatformId[] }) {
  const smooth = data.length > 31;
  const series = useMemo(() => {
    if (!smooth) return data;
    return data.map((row, i) => {
      const out: Row = { date: row.date };
      for (const p of platforms) {
        const win = data.slice(Math.max(0, i - 6), i + 1).map((r) => r[p] as number | null);
        const vals = win.filter((v): v is number => v !== null);
        out[p] = vals.length === win.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
      }
      return out;
    });
  }, [data, platforms, smooth]);
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <Card>
      <CardHeader
        title="Sprzedaż platform w czasie"
        subtitle={smooth ? "Średnia krocząca 7 dni (dzienna sprzedaż)" : "Dzienna sprzedaż po rabatach i zwrotach"}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 pt-3 text-[12px] text-muted">
        {platforms.map((p) => (
          <span key={p} className="flex items-center gap-2">
            <span className="h-[3px] w-4 rounded-full" style={{ background: PLATFORMS[p].color }} />
            {PLATFORMS[p].label}
          </span>
        ))}
      </div>
      <div className="h-[300px] px-2 pb-3 pt-2">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
          <LineChart data={series} margin={{ top: 10, right: 16, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#1b2538" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => formatDayMonth(v)}
              interval={tickEvery - 1}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6b7891", fontSize: 11.5 }}
              dy={8}
            />
            <YAxis tickFormatter={formatAxisPLN} tickLine={false} axisLine={false} tick={{ fill: "#6b7891", fontSize: 11.5 }} width={58} />
            <Tooltip
              cursor={{ stroke: "#3a4766", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Row;
                return (
                  <ChartTooltipBox
                    title={formatWeekdayDate(row.date as string)}
                    rows={platforms.map((p) => ({
                      label: PLATFORMS[p].label,
                      value: formatPLN(row[p] as number | null),
                      color: PLATFORMS[p].color,
                    }))}
                    footnote={smooth ? "Średnia z 7 dni kończących się tym dniem" : "Sprzedaż po rabatach i zwrotach"}
                  />
                );
              }}
            />
            {platforms.map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PLATFORMS[p].color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "#0b1020", strokeWidth: 2 }}
                connectNulls={false}
                animationDuration={500}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
