import { describe, expect, it } from "vitest";
import { computeKpis, dailySeries, orderFee, platformBreakdown, weekdaySeries } from "@/lib/kpi";
import { generateInsights } from "@/lib/insights";
import { demoCommissionRates, generateDemoDataset } from "@/lib/demo/generate";
import type { CommissionRate, NormalizedOrder } from "@/lib/types";

function order(p: Partial<NormalizedOrder>): NormalizedOrder {
  return {
    id: Math.random().toString(36),
    organization_id: "org",
    restaurant_id: "r1",
    platform: "glovo",
    external_order_id: null,
    order_datetime: "2026-10-01T12:00:00",
    order_date: "2026-10-01",
    order_status: "completed",
    currency: "PLN",
    gross_sales: 100,
    discount_amount: null,
    refund_amount: null,
    commission_amount: 25,
    other_platform_fees: null,
    import_id: "imp",
    source_row: 1,
    created_at: "2026-10-01T12:00:00",
    ...p,
  };
}

const coverage = { from: "2026-09-01", to: "2026-10-31" };
const filter = { range: { from: "2026-10-01", to: "2026-10-07" }, restaurantId: "all" as const, platforms: [] };

describe("computeKpis", () => {
  it("liczy sprzedaż po rabatach i zwrotach, pomija anulowane", () => {
    const orders = [
      order({ gross_sales: 100, discount_amount: 10 }),
      order({ gross_sales: 50, refund_amount: 50 }),
      order({ gross_sales: 80, order_status: "cancelled" }),
    ];
    const k = computeKpis(orders, filter, coverage, []);
    expect(k.sales.value).toBe(90);
    expect(k.orders.value).toBe(2);
    expect(k.aov.value).toBe(45);
    expect(k.cancellationRate.value).toBeCloseTo(1 / 3);
  });

  it("zwraca null (Brak danych), gdy zakres poza pokryciem danych — nie 0 zł", () => {
    const k = computeKpis([order({})], { ...filter, range: { from: "2027-01-01", to: "2027-01-07" } }, coverage, []);
    expect(k.sales.value).toBeNull();
    expect(k.orders.value).toBeNull();
    expect(k.coverage).toBe("none");
  });

  it("zwraca 0 zł, gdy zakres jest pokryty, ale brak sprzedaży (prawdziwe zero)", () => {
    const k = computeKpis([], filter, coverage, []);
    expect(k.sales.value).toBe(0);
    expect(k.aov.value).toBeNull();
  });

  it("nie liczy kwoty po opłatach, gdy brak prowizji i brak stawki", () => {
    const k = computeKpis([order({ commission_amount: null, platform: "pyszne" })], filter, coverage, []);
    expect(k.afterFees.value).toBeNull();
    expect(k.afterFees.unknownPlatforms).toEqual(["pyszne"]);
  });

  it("estymuje opłaty według stawki obowiązującej w dniu zamówienia", () => {
    const rates: CommissionRate[] = [
      { id: "a", restaurant_id: "r1", platform: "pyszne", rate: 0.1, valid_from: "2026-01-01" },
      { id: "b", restaurant_id: "r1", platform: "pyszne", rate: 0.2, valid_from: "2026-10-01" },
    ];
    const o = order({ commission_amount: null, platform: "pyszne", gross_sales: 100, discount_amount: 20 });
    expect(orderFee(o, rates)).toEqual({ kind: "estimated", amount: 16 });
    const k = computeKpis([o], filter, coverage, rates);
    expect(k.afterFees.value).toBe(64);
    expect(k.afterFees.estimatedShare).toBe(1);
  });

  it("porównuje z poprzednim okresem tylko przy pełnym pokryciu", () => {
    const orders = [order({}), order({ order_date: "2026-09-28" })];
    const k = computeKpis(orders, filter, coverage, []);
    expect(k.comparison.available).toBe(true);
    expect(k.sales.delta).toBe(0);
    const k2 = computeKpis(orders, filter, { from: "2026-09-27", to: "2026-10-31" }, []);
    expect(k2.comparison.available).toBe(false);
    expect(k2.sales.delta).toBeNull();
  });
});

describe("serie i rozbicie", () => {
  it("średnia wg dnia tygodnia liczy tylko dni pokryte danymi", () => {
    const daily = dailySeries([order({})], filter, coverage, [], false);
    const wd = weekdaySeries(daily);
    expect(wd.every((w) => w.occurrences === 1)).toBe(true);
    // 2026-10-01 to czwartek (index 3)
    expect(wd[3].avgSales).toBe(100);
  });

  it("rozbicie platform sumuje się do 100%", () => {
    const rows = platformBreakdown(
      [order({}), order({ platform: "wolt", gross_sales: 300 })],
      filter,
      coverage,
      [],
    );
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });
});

describe("dane demo", () => {
  const end = "2026-11-07";
  const ds = generateDemoDataset(end);
  const rates = demoCommissionRates(ds.coverage.from);

  it("generuje 90 dni deterministycznie", () => {
    expect(ds.coverage).toEqual({ from: "2026-08-10", to: end });
    expect(generateDemoDataset(end).orders.length).toBe(ds.orders.length);
    expect(ds.orders.length).toBeGreaterThan(5000);
  });

  it("insighty powstają z danych i pomijają reguły bez kompletności", () => {
    const f = { range: { from: "2026-10-09", to: end }, restaurantId: "all" as const, platforms: [] };
    const res = generateInsights(ds.orders, f, ds.coverage, rates);
    expect(res.insights.length).toBeGreaterThanOrEqual(3);
    const f90 = { ...f, range: ds.coverage };
    const res90 = generateInsights(ds.orders, f90, ds.coverage, rates);
    expect(res90.skipped.map((s) => s.id)).toContain("platformTrend");
  });
});
