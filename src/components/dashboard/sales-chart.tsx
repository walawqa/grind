"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { previousRange } from "@/lib/dates";
import { formatAxisPLN, formatDayMonth, formatInt, formatPLN, formatRange, formatWeekdayDate } from "@/lib/format";
import type { DailyPoint } from "@/lib/kpi";
import type { DateRange } from "@/lib/types";
import { ChartTooltipBox } from "./chart-tooltip";

type Metric = "sales" | "orders";

const ACCENT = "#A78BFA";
const PREV = "#5B6886";

export function SalesChart({
  data,
  range,
  comparison,
}: {
  data: DailyPoint[];
  range: DateRange;
  comparison: boolean;
}) {
  const [metric, setMetric] = useState<Metric>("sales");
  const key = metric === "sales" ? "sales" : "orders";
  const prevKey = metric === "sales" ? "prevSales" : "prevOrders";
  const fmt = (v: number | null) => (metric === "sales" ? formatPLN(v) : formatInt(v));
  const prev = previousRange(range);
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));
  const hasAny = data.some((d) => d[key] !== null);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Sprzedaż w czasie"
        subtitle={metric === "sales" ? "Dzienna sprzedaż po rabatach i zwrotach" : "Dzienna liczba zrealizowanych zamówień"}
        action={
          <Segmented
            ariaLabel="Miara wykresu"
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "sales", label: "Sprzedaż" },
              { value: "orders", label: "Zamówienia" },
            ]}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pt-3 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-[3px] w-4 rounded-full" style={{ background: ACCENT }} />
          {formatRange(range.from, range.to)}
        </span>
        {comparison ? (
          <span className="flex items-center gap-2">
            <span
              className="h-[3px] w-4 rounded-full"
              style={{ background: `repeating-linear-gradient(90deg, ${PREV} 0 3px, transparent 3px 5px)` }}
            />
            Poprzedni okres ({formatRange(prev.from, prev.to)})
          </span>
        ) : (
          <span className="text-subtle">Porównanie niedostępne — brak pełnych danych za poprzedni okres</span>
        )}
      </div>
      <div className="h-[280px] w-full px-2 pb-3 pt-2 sm:h-[300px] xl:h-auto xl:min-h-[300px] xl:flex-1">
        {hasAny ? (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 200 }}>
            <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT} stopOpacity={0.32} />
                  <stop offset="60%" stopColor={ACCENT} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
                <filter id="lineGlow" x="-10%" y="-50%" width="120%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke="#1b2538" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDayMonth}
                interval={tickEvery - 1}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7891", fontSize: 11.5 }}
                dy={8}
                minTickGap={8}
              />
              <YAxis
                tickFormatter={(v) => (metric === "sales" ? formatAxisPLN(v) : formatInt(v))}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7891", fontSize: 11.5 }}
                width={58}
              />
              <Tooltip
                cursor={{ stroke: "#3a4766", strokeWidth: 1, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as DailyPoint;
                  const rows = [
                    {
                      label: metric === "sales" ? "Sprzedaż" : "Zamówienia",
                      value: fmt(d[key]),
                      color: ACCENT,
                    },
                  ];
                  if (comparison)
                    rows.push({ label: "Poprzedni okres", value: fmt(d[prevKey]), color: PREV, dashed: true, muted: true } as never);
                  return (
                    <ChartTooltipBox
                      title={formatWeekdayDate(d.date)}
                      rows={rows}
                      footnote={metric === "sales" ? "Kwoty z VAT, po rabatach i zwrotach" : "Tylko zamówienia zrealizowane"}
                    />
                  );
                }}
              />
              {comparison ? (
                <Line
                  type="monotone"
                  dataKey={prevKey}
                  stroke={PREV}
                  strokeWidth={1.4}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey={key}
                stroke={ACCENT}
                strokeWidth={2.2}
                fill="url(#salesFill)"
                dot={false}
                activeDot={{ r: 4.5, fill: ACCENT, stroke: "#0b1020", strokeWidth: 2 }}
                animationDuration={500}
                style={{ filter: "url(#lineGlow)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-subtle">Brak danych w wybranym zakresie</div>
        )}
      </div>
    </Card>
  );
}
