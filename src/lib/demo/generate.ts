/**
 * Generator W PEŁNI SYNTETYCZNYCH danych demonstracyjnych.
 * Fikcyjna sieć „Pizza Nova”. Brak związku z jakąkolwiek realną firmą.
 * Deterministyczny (ziarno), więc te same daty dają te same dane.
 */
import { addDays, eachDay, weekdayIndex } from "../dates";
import type { CommissionRate, Dataset, NormalizedOrder, PlatformId, Restaurant } from "../types";

export const DEMO_ORG_ID = "org_demo";
export const DEMO_DAYS = 90;

export const DEMO_RESTAURANTS: Restaurant[] = [
  {
    id: "rest_demo_centrum",
    organization_id: DEMO_ORG_ID,
    name: "Pizza Nova — Centrum",
    city: "Łódź",
    currency: "PLN",
    timezone: "Europe/Warsaw",
  },
  {
    id: "rest_demo_widzew",
    organization_id: DEMO_ORG_ID,
    name: "Pizza Nova — Widzew",
    city: "Łódź",
    currency: "PLN",
    timezone: "Europe/Warsaw",
  },
];

interface PlatformProfile {
  share: number;
  avgBasket: number;
  /** Rzeczywista prowizja z pliku; `null` = eksport nie zawiera prowizji. */
  commissionRate: ((dayIdx: number) => number) | null;
  otherFeeChance: number;
  idPrefix: string;
  /** Mnożnik udziału rosnący w czasie (trend platformy). */
  trend: (dayIdx: number) => number;
}

const PROFILES: Record<Exclude<PlatformId, "other">, PlatformProfile> = {
  glovo: {
    share: 0.34,
    avgBasket: 61,
    // zmiana stawki w połowie okresu: 28% → 30%
    commissionRate: (d) => (d < 45 ? 0.28 : 0.3),
    otherFeeChance: 0.1,
    idPrefix: "GLV",
    trend: () => 1,
  },
  ubereats: {
    share: 0.26,
    avgBasket: 68,
    commissionRate: () => 0.3,
    otherFeeChance: 0.05,
    idPrefix: "UE",
    trend: (d) => 0.85 + d * 0.0035,
  },
  pyszne: {
    share: 0.22,
    avgBasket: 57,
    commissionRate: null, // brak prowizji w eksporcie → estymacja wg stawek użytkownika
    otherFeeChance: 0,
    idPrefix: "PYS",
    trend: (d) => 1.08 - d * 0.0015,
  },
  wolt: {
    share: 0.18,
    avgBasket: 64,
    commissionRate: () => 0.27,
    otherFeeChance: 0.15,
    idPrefix: "WLT",
    trend: () => 1,
  },
};

/** Domyślne stawki użytkownika (do estymacji, gdy plik nie zawiera prowizji). */
export function demoCommissionRates(startDate: string): CommissionRate[] {
  const rates: CommissionRate[] = [];
  for (const r of DEMO_RESTAURANTS) {
    rates.push(
      { id: `${r.id}_glovo`, restaurant_id: r.id, platform: "glovo", rate: 0.28, valid_from: startDate },
      { id: `${r.id}_ue`, restaurant_id: r.id, platform: "ubereats", rate: 0.3, valid_from: startDate },
      { id: `${r.id}_pys`, restaurant_id: r.id, platform: "pyszne", rate: 0.15, valid_from: startDate },
      { id: `${r.id}_wolt`, restaurant_id: r.id, platform: "wolt", rate: 0.27, valid_from: startDate },
    );
  }
  return rates;
}

// Popyt wg dnia tygodnia: Pn … Nd
const WEEKDAY_FACTOR = [0.78, 0.82, 0.88, 0.96, 1.24, 1.38, 1.3];

// Rozkład godzinowy (11:00–23:00): szczyt obiadowy i wieczorny
const HOUR_WEIGHTS: [number, number][] = [
  [11, 3], [12, 8], [13, 9], [14, 6], [15, 4], [16, 5],
  [17, 9], [18, 12], [19, 12], [20, 9], [21, 6], [22, 3],
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickWeighted<T>(rnd: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rnd() * total;
  for (const [item, w] of items) {
    x -= w;
    if (x <= 0) return item;
  }
  return items[items.length - 1][0];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function generateDemoDataset(endDate: string, days = DEMO_DAYS): Dataset {
  const startDate = addDays(endDate, -(days - 1));
  const rnd = mulberry32(20260101);
  const orders: NormalizedOrder[] = [];
  const createdAt = `${endDate}T23:59:00`;

  const restaurantBase: Record<string, number> = {
    rest_demo_centrum: 62,
    rest_demo_widzew: 36,
  };

  eachDay(startDate, endDate).forEach((date, dayIdx) => {
    const wd = weekdayIndex(date);
    // łagodny wzrost w czasie, wyraźniejszy spadek w ostatnim tygodniu (do insightów)
    const growth = 0.92 + (dayIdx / days) * 0.16;
    const lastWeekDip = dayIdx >= days - 7 ? 0.88 : 1;

    for (const restaurant of DEMO_RESTAURANTS) {
      const base = restaurantBase[restaurant.id];
      const weights = (Object.keys(PROFILES) as Exclude<PlatformId, "other">[]).map(
        (p) => [p, PROFILES[p].share * PROFILES[p].trend(dayIdx)] as [Exclude<PlatformId, "other">, number],
      );
      const expected = base * WEEKDAY_FACTOR[wd] * growth * lastWeekDip;
      const count = Math.max(0, Math.round(expected + gaussian(rnd) * Math.sqrt(expected) * 0.8));

      for (let i = 0; i < count; i++) {
        const platform = pickWeighted(rnd, weights);
        const profile = PROFILES[platform];
        const hour = pickWeighted(rnd, HOUR_WEIGHTS);
        const minute = Math.floor(rnd() * 60);
        const basket = Math.max(24, profile.avgBasket * (1 + gaussian(rnd) * 0.32));
        const gross = round2(basket);
        const cancelled = rnd() < 0.035;
        const discount = !cancelled && rnd() < 0.16 ? round2(gross * (0.1 + rnd() * 0.15)) : null;
        const refund = !cancelled && rnd() < 0.015 ? round2(gross * (0.3 + rnd() * 0.7)) : null;
        const base4Commission = gross - (discount ?? 0);
        const commission =
          profile.commissionRate && !cancelled ? round2(base4Commission * profile.commissionRate(dayIdx)) : null;
        // Inne opłaty: tylko tam, gdzie eksport zawiera opłaty (inaczej null — nieznane, nie 0)
        const otherFees =
          profile.commissionRate === null
            ? null
            : !cancelled && rnd() < profile.otherFeeChance
              ? round2(2 + rnd() * 4)
              : 0;
        const seq = orders.length + 1;

        orders.push({
          id: `ord_${seq}`,
          organization_id: DEMO_ORG_ID,
          restaurant_id: restaurant.id,
          platform,
          external_order_id: `${profile.idPrefix}-${(100000 + seq * 7).toString(36).toUpperCase()}`,
          order_datetime: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
          order_date: date,
          order_status: cancelled ? "cancelled" : "completed",
          currency: "PLN",
          gross_sales: gross,
          discount_amount: discount,
          refund_amount: refund,
          commission_amount: commission,
          other_platform_fees: otherFees,
          import_id: `imp_demo_${platform}`,
          source_row: seq,
          created_at: createdAt,
        });
      }
    }
  });

  return {
    restaurants: DEMO_RESTAURANTS,
    orders,
    coverage: { from: startDate, to: endDate },
    isDemo: true,
  };
}
