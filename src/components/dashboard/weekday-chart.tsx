"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from "@/lib/dates";
import { formatAxisPLN, formatPLN } from "@/lib/format";
import type { WeekdayPoint } from "@/lib/kpi";
import { ChartTooltipBox } from "./chart-tooltip";

type Metric = "avgSales" | "avgOrders";

export function WeekdayChart({ data }: { data: WeekdayPoint[] }) {
  const [metric, setMetric] = useState<Metric>("avgSales");
  const values = data.map((d) => d[metric]);
  const max = Math.max(...values.map((v) => v ?? 0));
  const chartData = data.map((d) => ({ ...d, name: WEEKDAYS_SHORT[d.weekday] }));
  const hasAny = values.some((v) => v !== null);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Sprzedaż wg dni tygodnia"
        subtitle="Średnia dzienna w wybranym okresie"
        action={
          <Segmented
            ariaLabel="Miara wykresu dni tygodnia"
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "avgSales", label: "Sprzedaż" },
              { value: "avgOrders", label: "Zamówienia" },
            ]}
          />
        }
      />
      <div className="h-[240px] w-full px-2 pb-3 pt-4 sm:h-[260px] xl:h-auto xl:min-h-[260px] xl:flex-1">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap="24%">
              <defs>
                <linearGradient id="barTop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B69CFF" />
                  <stop offset="100%" stopColor="#7C4FF0" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="barRest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3A4A70" />
                  <stop offset="100%" stopColor="#253250" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1b2538" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#6b7891", fontSize: 12 }} dy={6} />
              <YAxis
                tickFormatter={(v) => (metric === "avgSales" ? formatAxisPLN(v) : String(v))}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7891", fontSize: 11.5 }}
                width={58}
              />
              <Tooltip
                cursor={{ fill: "rgba(139,92,246,0.06)", radius: 8 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as WeekdayPoint;
                  return (
                    <ChartTooltipBox
                      title={WEEKDAYS_LONG[d.weekday]}
                      rows={[
                        { label: "Średnia sprzedaż", value: d.avgSales === null ? "Brak danych" : formatPLN(d.avgSales), muted: metric !== "avgSales" },
                        {
                          label: "Średnio zamówień",
                          value: d.avgOrders === null ? "Brak danych" : d.avgOrders.toLocaleString("pl-PL", { maximumFractionDigits: 1 }),
                          muted: metric !== "avgOrders",
                        },
                      ]}
                      footnote={`Średnia z ${d.occurrences} ${d.occurrences === 1 ? "dnia" : "dni"}`}
                    />
                  );
                }}
              />
              <Bar dataKey={metric} radius={[8, 8, 3, 3]} animationDuration={450}>
                {chartData.map((d) => (
                  <Cell key={d.weekday} fill={d[metric] === max && max > 0 ? "url(#barTop)" : "url(#barRest)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-subtle">Brak danych</div>
        )}
      </div>
    </Card>
  );
}
