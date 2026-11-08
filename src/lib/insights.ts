/**
 * Regułowy silnik insightów. Każda reguła:
 *  - sprawdza kompletność i minimalną liczebność danych,
 *  - zwraca insight z liczbami wyliczonymi z danych ALBO powód pominięcia.
 * Żadnych zakodowanych na stałe wyników.
 */
import { addDays } from "./dates";
import { formatDelta, formatPercent, formatPLN } from "./format";
import {
  coverageOf,
  dailySeries,
  filterOrders,
  platformBreakdown,
  totalsOf,
  weekdaySeries,
  type OrderFilter,
} from "./kpi";
import { platformLabel } from "./platforms";
import type { CommissionRate, DateRange, NormalizedOrder } from "./types";

export type InsightTone = "positive" | "negative" | "neutral" | "warning";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  /** Na podstawie czego policzono — pokazywane w szczegółach. */
  basis: string;
}

export interface SkippedRule {
  id: string;
  name: string;
  reason: string;
}

export interface InsightResult {
  insights: Insight[];
  skipped: SkippedRule[];
}

const WEEKDAY_IN = ["W poniedziałek", "We wtorek", "W środę", "W czwartek", "W piątek", "W sobotę", "W niedzielę"];

const MIN_ORDERS_TREND = 20;
const MIN_ORDERS_PLATFORM = 30;
const MIN_WEEKDAY_OCCURRENCES = 4;
const MIN_TREND_CHANGE = 0.05;

export function generateInsights(
  orders: NormalizedOrder[],
  filter: OrderFilter,
  coverage: DateRange,
  rates: CommissionRate[],
): InsightResult {
  const insights: Insight[] = [];
  const skipped: SkippedRule[] = [];

  // 1. Trend: ostatnie 7 dni vs poprzednie 7 dni (kończąc na końcu wybranego zakresu)
  {
    const end = filter.range.to < coverage.to ? filter.range.to : coverage.to;
    const last = { from: addDays(end, -6), to: end };
    const before = { from: addDays(end, -13), to: addDays(end, -7) };
    if (coverageOf(last, coverage) !== "full" || coverageOf(before, coverage) !== "full") {
      skipped.push({ id: "trend7", name: "Trend 7 dni", reason: "Potrzeba 14 dni kompletnych danych." });
    } else {
      const a = totalsOf(filterOrders(orders, { ...filter, range: last }), rates);
      const b = totalsOf(filterOrders(orders, { ...filter, range: before }), rates);
      if (a.orders < MIN_ORDERS_TREND || b.orders < MIN_ORDERS_TREND || b.sales <= 0) {
        skipped.push({ id: "trend7", name: "Trend 7 dni", reason: `Za mało zamówień (min. ${MIN_ORDERS_TREND} w każdym tygodniu).` });
      } else {
        const delta = (a.sales - b.sales) / b.sales;
        const basis = `Sprzedaż ${formatPLN(a.sales)} (ostatnie 7 dni) vs ${formatPLN(b.sales)} (7 dni wcześniej).`;
        if (Math.abs(delta) < MIN_TREND_CHANGE) {
          insights.push({
            id: "trend7",
            tone: "neutral",
            title: `Sprzedaż w ostatnich 7 dniach jest stabilna (${formatDelta(delta)}).`,
            detail: "Zmiana wobec poprzedniego tygodnia mieści się w granicy ±5%.",
            basis,
          });
        } else {
          insights.push({
            id: "trend7",
            tone: delta > 0 ? "positive" : "negative",
            title: `Sprzedaż w ostatnich 7 dniach ${delta > 0 ? "wzrosła" : "spadła"} o ${formatDelta(Math.abs(delta)).replace("+", "")} wobec poprzednich 7 dni.`,
            detail:
              delta > 0
                ? "Warto sprawdzić, co zadziałało — promocje, pogoda, widoczność w aplikacjach."
                : "Sprawdź dostępność lokalu w aplikacjach, czasy dostaw i ceny w ostatnim tygodniu.",
            basis,
          });
        }
      }
    }
  }

  const rows = platformBreakdown(orders, filter, coverage, rates);

  // 2. Najwyższy średni koszyk
  {
    const eligible = rows.filter((r) => r.orders >= MIN_ORDERS_PLATFORM && r.aov !== null);
    if (eligible.length < 2) {
      skipped.push({
        id: "aov",
        name: "Najwyższy średni koszyk",
        reason: `Potrzeba co najmniej 2 platform z min. ${MIN_ORDERS_PLATFORM} zamówieniami.`,
      });
    } else {
      const best = eligible.reduce((m, r) => (r.aov! > m.aov! ? r : m));
      const others = eligible.filter((r) => r !== best);
      const othersAov = others.reduce((s, r) => s + r.sales, 0) / others.reduce((s, r) => s + r.orders, 0);
      insights.push({
        id: "aov",
        tone: "neutral",
        title: `Najwyższy średni koszyk ma ${platformLabel(best.platform)}: ${formatPLN(best.aov)}.`,
        detail: `To o ${formatDelta((best.aov! - othersAov) / othersAov).replace("+", "")} więcej niż średnio na pozostałych platformach (${formatPLN(othersAov)}).`,
        basis: `${best.orders} zrealizowanych zamówień na ${platformLabel(best.platform)} w wybranym okresie.`,
      });
    }
  }

  // 3. Najmocniejszy dzień tygodnia (zamówienia)
  {
    const daily = dailySeries(orders, filter, coverage, rates, false);
    const wd = weekdaySeries(daily);
    if (wd.some((w) => w.occurrences < MIN_WEEKDAY_OCCURRENCES)) {
      skipped.push({
        id: "weekday",
        name: "Najmocniejszy dzień tygodnia",
        reason: `Każdy dzień tygodnia musi wystąpić min. ${MIN_WEEKDAY_OCCURRENCES} razy (wybierz zakres ≥ 28 dni).`,
      });
    } else {
      const best = wd.reduce((m, w) => (w.avgOrders! > m.avgOrders! ? w : m));
      const rest = wd.filter((w) => w !== best);
      const restAvg = rest.reduce((s, w) => s + w.avgOrders!, 0) / rest.length;
      if (restAvg > 0) {
        const diff = (best.avgOrders! - restAvg) / restAvg;
        insights.push({
          id: "weekday",
          tone: "positive",
          title: `${WEEKDAY_IN[best.weekday]} masz średnio o ${formatDelta(diff).replace("+", "")} więcej zamówień niż w pozostałe dni.`,
          detail: `Średnio ${best.avgOrders!.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} zamówień vs ${restAvg.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} w inne dni.`,
          basis: `Średnia z ${best.occurrences} wystąpień każdego dnia tygodnia w wybranym okresie.`,
        });
      }
    }
  }

  // 4. Najszybciej rosnąca / spadająca platforma
  {
    const comparable = rows.filter((r) => r.delta !== null && r.orders >= MIN_ORDERS_PLATFORM);
    if (comparable.length < 2) {
      skipped.push({
        id: "platformTrend",
        name: "Zmiana udziału platform",
        reason: "Brak kompletnych danych za poprzedni okres lub za mało zamówień.",
      });
    } else {
      const worst = comparable.reduce((m, r) => (r.delta! < m.delta! ? r : m));
      const best = comparable.reduce((m, r) => (r.delta! > m.delta! ? r : m));
      const pick = Math.abs(worst.delta!) > Math.abs(best.delta!) ? worst : best;
      if (Math.abs(pick.delta!) >= MIN_TREND_CHANGE) {
        insights.push({
          id: "platformTrend",
          tone: pick.delta! > 0 ? "positive" : "negative",
          title: `${platformLabel(pick.platform)}: sprzedaż ${pick.delta! > 0 ? "wzrosła" : "spadła"} o ${formatDelta(Math.abs(pick.delta!)).replace("+", "")} wobec poprzedniego okresu.`,
          detail: `${formatPLN(pick.sales)} teraz vs ${formatPLN(pick.prevSales)} w poprzednim okresie tej samej długości.`,
          basis: "Porównanie z bezpośrednio poprzedzającym okresem o tej samej długości.",
        });
      } else {
        skipped.push({ id: "platformTrend", name: "Zmiana udziału platform", reason: "Żadna platforma nie zmieniła sprzedaży o więcej niż 5%." });
      }
    }
  }

  // 5. Obciążenie opłatami
  {
    const known = rows.filter((r) => r.fees !== null && r.sales > 0);
    if (known.length === 0 || known.length < rows.length) {
      skipped.push({
        id: "fees",
        name: "Udział opłat platform",
        reason: "Brak prowizji w pliku i brak stawek w ustawieniach dla części platform.",
      });
    } else {
      const sales = known.reduce((s, r) => s + r.sales, 0);
      const fees = known.reduce((s, r) => s + r.fees!, 0);
      const top = known.reduce((m, r) => (r.feeRate! > m.feeRate! ? r : m));
      const est = known.filter((r) => r.feeKind !== "actual").map((r) => platformLabel(r.platform));
      insights.push({
        id: "fees",
        tone: "warning",
        title: `Opłaty platform to ok. ${formatPercent(fees / sales, 0)} Twojej sprzedaży.`,
        detail: `Najwyższy udział opłat: ${platformLabel(top.platform)} (${formatPercent(top.feeRate)}).${est.length ? ` Zawiera estymację dla: ${est.join(", ")}.` : ""}`,
        basis: `${formatPLN(fees)} opłat przy ${formatPLN(sales)} sprzedaży.`,
      });
    }
  }

  // 6. Anulacje (tylko gdy wysokie)
  {
    const t = totalsOf(filterOrders(orders, filter), rates);
    const all = t.orders + t.cancelled;
    if (all >= 50) {
      const rate = t.cancelled / all;
      if (rate >= 0.05) {
        insights.push({
          id: "cancel",
          tone: "negative",
          title: `Odsetek anulowanych zamówień wynosi ${formatPercent(rate)}.`,
          detail: "To powyżej progu 5%. Sprawdź przyczyny anulacji w panelach platform.",
          basis: `${t.cancelled} anulowanych z ${all} zamówień.`,
        });
      }
    }
  }

  return { insights, skipped };
}
