"use client";

/**
 * Stan trybu demo: syntetyczny zbiór danych, stawki prowizji (tylko w pamięci sesji)
 * oraz filtry. W Etapie 2 ten sam interfejs zostanie zasilony danymi z Supabase.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addDays, todayInWarsaw } from "@/lib/dates";
import { demoCommissionRates, generateDemoDataset } from "@/lib/demo/generate";
import { generateInsights, type InsightResult } from "@/lib/insights";
import {
  computeKpis,
  dailySeries,
  platformBreakdown,
  weekdaySeries,
  type DailyPoint,
  type KpiSet,
  type OrderFilter,
  type PlatformRow,
  type WeekdayPoint,
} from "@/lib/kpi";
import type { CommissionRate, Dataset, DateRange, PlatformId, RangePreset } from "@/lib/types";

interface Derived {
  filter: OrderFilter;
  kpis: KpiSet;
  daily: DailyPoint[];
  weekday: WeekdayPoint[];
  platforms: PlatformRow[];
  insights: InsightResult;
}

interface Ctx {
  ready: boolean;
  dataset: Dataset | null;
  rates: CommissionRate[];
  setRates: (r: CommissionRate[]) => void;
  resetRates: () => void;
  preset: RangePreset;
  range: DateRange | null;
  restaurantId: string | "all";
  platforms: PlatformId[];
  setPreset: (p: Exclude<RangePreset, "custom">) => void;
  setCustomRange: (r: DateRange) => void;
  setRestaurantId: (id: string | "all") => void;
  setPlatforms: (p: PlatformId[]) => void;
  derived: Derived | null;
}

const DemoCtx = createContext<Ctx | null>(null);

export function useDemo(): Ctx {
  const ctx = useContext(DemoCtx);
  if (!ctx) throw new Error("useDemo musi być użyte wewnątrz DemoDataProvider");
  return ctx;
}

const PRESET_DAYS: Record<Exclude<RangePreset, "custom">, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [preset, setPresetState] = useState<RangePreset>("30d");
  const [range, setRange] = useState<DateRange | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | "all">("all");
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);

  // Generujemy dane po stronie klienta (po zamontowaniu) — dane kończą się „wczoraj”.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const end = addDays(todayInWarsaw(), -1);
      const ds = generateDemoDataset(end);
      setDataset(ds);
      setRates(demoCommissionRates(ds.coverage.from));
      setRange({ from: addDays(end, -29), to: end });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const setPreset = useCallback(
    (p: Exclude<RangePreset, "custom">) => {
      if (!dataset) return;
      const end = dataset.coverage.to;
      setPresetState(p);
      setRange({ from: addDays(end, -(PRESET_DAYS[p] - 1)), to: end });
    },
    [dataset],
  );

  const setCustomRange = useCallback((r: DateRange) => {
    setPresetState("custom");
    setRange(r.from <= r.to ? r : { from: r.to, to: r.from });
  }, []);

  const resetRates = useCallback(() => {
    if (dataset) setRates(demoCommissionRates(dataset.coverage.from));
  }, [dataset]);

  const derived = useMemo<Derived | null>(() => {
    if (!dataset || !range) return null;
    const filter: OrderFilter = { range, restaurantId, platforms };
    const kpis = computeKpis(dataset.orders, filter, dataset.coverage, rates);
    const daily = dailySeries(dataset.orders, filter, dataset.coverage, rates, kpis.comparison.available);
    return {
      filter,
      kpis,
      daily,
      weekday: weekdaySeries(daily),
      platforms: platformBreakdown(dataset.orders, filter, dataset.coverage, rates),
      insights: generateInsights(dataset.orders, filter, dataset.coverage, rates),
    };
  }, [dataset, range, restaurantId, platforms, rates]);

  const value: Ctx = {
    ready: !!derived,
    dataset,
    rates,
    setRates,
    resetRates,
    preset,
    range,
    restaurantId,
    platforms,
    setPreset,
    setCustomRange,
    setRestaurantId,
    setPlatforms,
    derived,
  };

  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}
