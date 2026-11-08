/**
 * Silnik KPI. Czyste funkcje — bez Reacta, łatwe do testowania.
 *
 * DEFINICJE (pokazywane także użytkownikowi, zob. KPI_DEFINITIONS):
 *  - Zamówienie kwalifikowane: status „completed”. Anulowane nie wchodzą do sprzedaży ani liczby zamówień.
 *  - Sprzedaż = Σ (gross_sales − rabat − zwrot) zamówień kwalifikowanych. Kwoty z VAT.
 *  - Średni koszyk = Sprzedaż / Liczba zamówień (gdy obie dostępne i zamówień > 0).
 *  - Opłaty platform: rzeczywiste (prowizja + inne opłaty z pliku) albo estymowane
 *    (stawka użytkownika × (gross − rabat)). Gdy brak obu — opłata nieznana → KPI „po opłatach” = brak danych.
 *  - Szacunkowa kwota po opłatach = Sprzedaż − opłaty. To NIE jest zysk.
 *  - Zmiana okres do okresu: wobec bezpośrednio poprzedniego okresu tej samej długości,
 *    tylko gdy oba okresy są w całości pokryte danymi.
 */
import { daysInclusive, eachDay, isWithin, previousRange, weekdayIndex } from "./dates";
import { PLATFORM_ORDER } from "./platforms";
import type { CommissionRate, DateRange, NormalizedOrder, PlatformId } from "./types";

// ---------- pojedyncze zamówienie ----------

export function isQualifying(o: NormalizedOrder): boolean {
  return o.order_status === "completed";
}

export function netSales(o: NormalizedOrder): number {
  return o.gross_sales - (o.discount_amount ?? 0) - (o.refund_amount ?? 0);
}

export type FeeKind = "actual" | "estimated" | "unknown";

export interface FeeResult {
  kind: FeeKind;
  amount: number | null;
}

/** Zwraca stawkę obowiązującą w danym dniu (najpóźniejszą z valid_from ≤ data). */
export function findRate(
  rates: CommissionRate[],
  restaurantId: string,
  platform: PlatformId,
  date: string,
): CommissionRate | null {
  let best: CommissionRate | null = null;
  for (const r of rates) {
    if (r.restaurant_id !== restaurantId || r.platform !== platform || r.valid_from > date) continue;
    if (!best || r.valid_from > best.valid_from) best = r;
  }
  return best;
}

export function orderFee(o: NormalizedOrder, rates: CommissionRate[]): FeeResult {
  if (o.commission_amount !== null) {
    return { kind: "actual", amount: o.commission_amount + (o.other_platform_fees ?? 0) };
  }
  const rate = findRate(rates, o.restaurant_id, o.platform, o.order_date);
  if (rate) {
    return { kind: "estimated", amount: (o.gross_sales - (o.discount_amount ?? 0)) * rate.rate };
  }
  return { kind: "unknown", amount: null };
}

// ---------- agregacja ----------

export interface Totals {
  sales: number;
  orders: number;
  cancelled: number;
  grossBeforeDeductions: number;
  discounts: number;
  refunds: number;
  feesActual: number;
  feesEstimated: number;
  /** Zamówienia kwalifikowane, dla których nie da się ustalić opłat. */
  feesUnknownOrders: number;
  feesUnknownPlatforms: Set<PlatformId>;
  feesEstimatedPlatforms: Set<PlatformId>;
}

export function emptyTotals(): Totals {
  return {
    sales: 0,
    orders: 0,
    cancelled: 0,
    grossBeforeDeductions: 0,
    discounts: 0,
    refunds: 0,
    feesActual: 0,
    feesEstimated: 0,
    feesUnknownOrders: 0,
    feesUnknownPlatforms: new Set(),
    feesEstimatedPlatforms: new Set(),
  };
}

export function addOrder(t: Totals, o: NormalizedOrder, rates: CommissionRate[]): void {
  if (!isQualifying(o)) {
    t.cancelled += 1;
    return;
  }
  t.orders += 1;
  t.sales += netSales(o);
  t.grossBeforeDeductions += o.gross_sales;
  t.discounts += o.discount_amount ?? 0;
  t.refunds += o.refund_amount ?? 0;
  const fee = orderFee(o, rates);
  if (fee.kind === "actual") t.feesActual += fee.amount!;
  else if (fee.kind === "estimated") {
    t.feesEstimated += fee.amount!;
    t.feesEstimatedPlatforms.add(o.platform);
  } else {
    t.feesUnknownOrders += 1;
    t.feesUnknownPlatforms.add(o.platform);
  }
}

export function totalsOf(orders: NormalizedOrder[], rates: CommissionRate[]): Totals {
  const t = emptyTotals();
  for (const o of orders) addOrder(t, o, rates);
  return t;
}

// ---------- filtrowanie i pokrycie ----------

export interface OrderFilter {
  range: DateRange;
  restaurantId: string | "all";
  platforms: PlatformId[];
}

export function filterOrders(orders: NormalizedOrder[], f: OrderFilter): NormalizedOrder[] {
  const pset = new Set(f.platforms);
  return orders.filter(
    (o) =>
      isWithin(o.order_date, f.range) &&
      (f.restaurantId === "all" || o.restaurant_id === f.restaurantId) &&
      (pset.size === 0 || pset.has(o.platform)),
  );
}

export type Coverage = "full" | "partial" | "none";

/** Na ile zakres jest pokryty danymi (z historii importów). */
export function coverageOf(range: DateRange, coverage: DateRange): Coverage {
  if (range.to < coverage.from || range.from > coverage.to) return "none";
  if (range.from >= coverage.from && range.to <= coverage.to) return "full";
  return "partial";
}

// ---------- KPI ----------

export interface KpiValue {
  value: number | null;
  previous: number | null;
  /** Zmiana względna (0.12 = +12%). `null` gdy porównanie nierzetelne. */
  delta: number | null;
  /** Wyjaśnienie, dlaczego brak wartości lub porównania. */
  note?: string;
}

export interface KpiSet {
  sales: KpiValue;
  orders: KpiValue;
  aov: KpiValue;
  afterFees: KpiValue & {
    feesTotal: number | null;
    estimatedShare: number;
    estimatedPlatforms: PlatformId[];
    unknownPlatforms: PlatformId[];
  };
  cancellationRate: KpiValue;
  coverage: Coverage;
  comparison: { available: boolean; range: DateRange; reason?: string };
  current: Totals;
}

function relDelta(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / Math.abs(prev);
}

function afterFeesValue(t: Totals): number | null {
  if (t.feesUnknownOrders > 0) return null;
  return t.sales - t.feesActual - t.feesEstimated;
}

export function computeKpis(
  orders: NormalizedOrder[],
  filter: OrderFilter,
  coverage: DateRange,
  rates: CommissionRate[],
): KpiSet {
  const cov = coverageOf(filter.range, coverage);
  const prevRange = previousRange(filter.range);
  const prevCov = coverageOf(prevRange, coverage);
  const comparisonAvailable = cov === "full" && prevCov === "full";
  const comparisonReason = comparisonAvailable
    ? undefined
    : prevCov !== "full"
      ? "Brak pełnych danych za poprzedni okres o tej samej długości."
      : "Wybrany zakres nie jest w pełni pokryty danymi.";

  const cur = totalsOf(filterOrders(orders, filter), rates);
  const prev = comparisonAvailable
    ? totalsOf(filterOrders(orders, { ...filter, range: prevRange }), rates)
    : null;

  const hasData = cov !== "none";
  const noDataNote = "Brak zaimportowanych danych w wybranym zakresie.";

  const mk = (curV: number | null, prevV: number | null, note?: string): KpiValue => ({
    value: curV,
    previous: prevV,
    delta: comparisonAvailable ? relDelta(curV, prevV) : null,
    note: !hasData ? noDataNote : note ?? (comparisonAvailable ? undefined : comparisonReason),
  });

  const salesCur = hasData ? cur.sales : null;
  const ordersCur = hasData ? cur.orders : null;
  const aovCur = hasData && cur.orders > 0 ? cur.sales / cur.orders : null;
  const aovPrev = prev && prev.orders > 0 ? prev.sales / prev.orders : null;
  const afterCur = hasData ? afterFeesValue(cur) : null;
  const afterPrev = prev ? afterFeesValue(prev) : null;
  const feesTotal = hasData && cur.feesUnknownOrders === 0 ? cur.feesActual + cur.feesEstimated : null;
  const allCount = cur.orders + cur.cancelled;
  const prevAll = prev ? prev.orders + prev.cancelled : 0;

  const unknownPlatforms = [...cur.feesUnknownPlatforms];

  return {
    sales: mk(salesCur, prev?.sales ?? null),
    orders: mk(ordersCur, prev?.orders ?? null),
    aov: mk(aovCur, aovPrev, hasData && cur.orders === 0 ? "Brak zrealizowanych zamówień." : undefined),
    afterFees: {
      ...mk(
        afterCur,
        afterPrev,
        hasData && afterCur === null
          ? "Brak prowizji w pliku i brak stawek w ustawieniach dla części platform."
          : undefined,
      ),
      feesTotal,
      estimatedShare: feesTotal ? cur.feesEstimated / feesTotal : 0,
      estimatedPlatforms: [...cur.feesEstimatedPlatforms],
      unknownPlatforms,
    },
    cancellationRate: mk(
      hasData && allCount > 0 ? cur.cancelled / allCount : null,
      prev && prevAll > 0 ? prev.cancelled / prevAll : null,
    ),
    coverage: cov,
    comparison: { available: comparisonAvailable, range: prevRange, reason: comparisonReason },
    current: cur,
  };
}

// ---------- serie do wykresów ----------

export interface DailyPoint {
  date: string;
  sales: number | null;
  orders: number | null;
  /** Wartość z odpowiadającego dnia poprzedniego okresu (do porównania). */
  prevSales: number | null;
  prevOrders: number | null;
  /** Szacunkowa kwota po opłatach, null gdy opłaty nieznane. */
  afterFees: number | null;
  aov: number | null;
}

export function dailySeries(
  orders: NormalizedOrder[],
  filter: OrderFilter,
  coverage: DateRange,
  rates: CommissionRate[],
  withPrevious: boolean,
): DailyPoint[] {
  const days = eachDay(filter.range.from, filter.range.to);
  const prevRange = previousRange(filter.range);
  const prevDays = eachDay(prevRange.from, prevRange.to);
  const byDay = new Map<string, Totals>();
  const scope = filterOrders(orders, {
    ...filter,
    range: { from: withPrevious ? prevRange.from : filter.range.from, to: filter.range.to },
  });
  for (const o of scope) {
    let t = byDay.get(o.order_date);
    if (!t) byDay.set(o.order_date, (t = emptyTotals()));
    addOrder(t, o, rates);
  }
  return days.map((date, i) => {
    const inCov = isWithin(date, coverage);
    const t = byDay.get(date) ?? emptyTotals();
    const pd = prevDays[i];
    const prevCovered = withPrevious && isWithin(pd, coverage);
    const pt = byDay.get(pd) ?? emptyTotals();
    return {
      date,
      sales: inCov ? t.sales : null,
      orders: inCov ? t.orders : null,
      prevSales: prevCovered ? pt.sales : null,
      prevOrders: prevCovered ? pt.orders : null,
      afterFees: inCov ? afterFeesValue(t) : null,
      aov: inCov && t.orders > 0 ? t.sales / t.orders : null,
    };
  });
}

export interface WeekdayPoint {
  weekday: number;
  /** Średnia dzienna sprzedaż dla danego dnia tygodnia (tylko dni pokryte danymi). */
  avgSales: number | null;
  avgOrders: number | null;
  occurrences: number;
}

export function weekdaySeries(daily: DailyPoint[]): WeekdayPoint[] {
  const acc = Array.from({ length: 7 }, () => ({ sales: 0, orders: 0, n: 0 }));
  for (const d of daily) {
    if (d.sales === null || d.orders === null) continue;
    const a = acc[weekdayIndex(d.date)];
    a.sales += d.sales;
    a.orders += d.orders;
    a.n += 1;
  }
  return acc.map((a, weekday) => ({
    weekday,
    avgSales: a.n ? a.sales / a.n : null,
    avgOrders: a.n ? a.orders / a.n : null,
    occurrences: a.n,
  }));
}

export interface PlatformRow {
  platform: PlatformId;
  orders: number;
  sales: number;
  aov: number | null;
  fees: number | null;
  feeKind: "actual" | "estimated" | "mixed" | "unknown";
  feeRate: number | null;
  share: number;
  cancelled: number;
  prevSales: number | null;
  delta: number | null;
}

export function platformBreakdown(
  orders: NormalizedOrder[],
  filter: OrderFilter,
  coverage: DateRange,
  rates: CommissionRate[],
): PlatformRow[] {
  const cov = coverageOf(filter.range, coverage);
  if (cov === "none") return [];
  const prevRange = previousRange(filter.range);
  const comparable = cov === "full" && coverageOf(prevRange, coverage) === "full";
  const cur = new Map<PlatformId, Totals>();
  const prev = new Map<PlatformId, Totals>();
  for (const o of filterOrders(orders, filter)) {
    if (!cur.has(o.platform)) cur.set(o.platform, emptyTotals());
    addOrder(cur.get(o.platform)!, o, rates);
  }
  if (comparable) {
    for (const o of filterOrders(orders, { ...filter, range: prevRange })) {
      if (!prev.has(o.platform)) prev.set(o.platform, emptyTotals());
      addOrder(prev.get(o.platform)!, o, rates);
    }
  }
  const totalSales = [...cur.values()].reduce((s, t) => s + t.sales, 0);
  return PLATFORM_ORDER.filter((p) => cur.has(p)).map((p) => {
    const t = cur.get(p)!;
    const pt = prev.get(p);
    const fees = t.feesUnknownOrders > 0 ? null : t.feesActual + t.feesEstimated;
    const feeKind: PlatformRow["feeKind"] =
      t.feesUnknownOrders > 0
        ? "unknown"
        : t.feesEstimated > 0 && t.feesActual > 0
          ? "mixed"
          : t.feesEstimated > 0
            ? "estimated"
            : "actual";
    const prevSales = comparable ? (pt?.sales ?? 0) : null;
    return {
      platform: p,
      orders: t.orders,
      sales: t.sales,
      aov: t.orders > 0 ? t.sales / t.orders : null,
      fees,
      feeKind,
      feeRate: fees !== null && t.sales > 0 ? fees / t.sales : null,
      share: totalSales > 0 ? t.sales / totalSales : 0,
      cancelled: t.cancelled,
      prevSales,
      delta: relDelta(t.sales, prevSales),
    };
  });
}

/** Dzienne sumy per platforma — do wykresu wieloseryjnego. */
export function dailyByPlatform(
  orders: NormalizedOrder[],
  filter: OrderFilter,
  coverage: DateRange,
): Array<Record<string, number | string | null>> {
  const days = eachDay(filter.range.from, filter.range.to);
  const map = new Map<string, Record<string, number>>();
  for (const o of filterOrders(orders, filter)) {
    if (!isQualifying(o)) continue;
    const row = map.get(o.order_date) ?? {};
    row[o.platform] = (row[o.platform] ?? 0) + netSales(o);
    map.set(o.order_date, row);
  }
  return days.map((date) => {
    const inCov = isWithin(date, coverage);
    const row = map.get(date) ?? {};
    const out: Record<string, number | string | null> = { date };
    for (const p of PLATFORM_ORDER) out[p] = inCov ? (row[p] ?? 0) : null;
    return out;
  });
}

export function rangeLength(range: DateRange): number {
  return daysInclusive(range.from, range.to);
}

export const KPI_DEFINITIONS = {
  sales:
    "Suma wartości zrealizowanych zamówień po odjęciu rabatów i zwrotów (kwoty z VAT). Anulowane zamówienia nie są wliczane.",
  orders: "Liczba zrealizowanych zamówień. Anulowane zamówienia są pomijane.",
  aov: "Sprzedaż podzielona przez liczbę zrealizowanych zamówień.",
  afterFees:
    "Sprzedaż minus prowizje i opłaty platform — rzeczywiste z pliku lub estymowane według Twoich stawek. To nie jest zysk: nie uwzględnia kosztów produktów, pracy, VAT ani innych kosztów.",
  comparison:
    "Porównanie z bezpośrednio poprzedzającym okresem o tej samej długości. Pokazywane tylko, gdy oba okresy mają kompletne dane.",
  cancellationRate: "Odsetek zamówień anulowanych wśród wszystkich zamówień w okresie.",
} as const;
