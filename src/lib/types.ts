/**
 * Model domenowy RestoPulse.
 * Nazwy pól odpowiadają kolumnom w docelowej bazie (Etap 2, Supabase/PostgreSQL).
 */

export type PlatformId = "glovo" | "ubereats" | "pyszne" | "wolt" | "other";

export type OrderStatus = "completed" | "cancelled";

/** Pojedyncze zamówienie po normalizacji (tabela `orders`). */
export interface NormalizedOrder {
  id: string;
  organization_id: string;
  restaurant_id: string;
  platform: PlatformId;
  /** Identyfikator z platformy — może nie istnieć w eksporcie. */
  external_order_id: string | null;
  /** ISO 8601 w strefie lokalu (Europe/Warsaw). */
  order_datetime: string;
  /** Data lokalna YYYY-MM-DD — przyspiesza agregacje. */
  order_date: string;
  order_status: OrderStatus;
  currency: "PLN";
  /** Wartość zamówienia przed rabatami i zwrotami (z VAT). */
  gross_sales: number;
  discount_amount: number | null;
  refund_amount: number | null;
  /** Prowizja z pliku platformy. `null` = brak w źródle (nie 0!). */
  commission_amount: number | null;
  other_platform_fees: number | null;
  import_id: string;
  source_row: number;
  created_at: string;
}

/**
 * Wiersz raportu zbiorczego (tabela `aggregate_reports`).
 * Używany, gdy eksport nie zawiera pojedynczych zamówień.
 * `orders_count` może być `null` — nie wolno go zastępować liczbą wierszy.
 */
export interface AggregateReportRow {
  id: string;
  organization_id: string;
  restaurant_id: string;
  platform: PlatformId;
  period_start: string;
  period_end: string;
  orders_count: number | null;
  gross_sales: number;
  commission_amount: number | null;
  import_id: string;
  source_row: number;
}

export interface Restaurant {
  id: string;
  organization_id: string;
  name: string;
  city: string;
  currency: "PLN";
  timezone: "Europe/Warsaw";
}

/** Stawka prowizji ustawiona przez użytkownika (tabela `commission_rates`). */
export interface CommissionRate {
  id: string;
  restaurant_id: string;
  platform: PlatformId;
  /** Ułamek, np. 0.27 = 27%. */
  rate: number;
  /** YYYY-MM-DD — od kiedy obowiązuje. */
  valid_from: string;
}

export interface Dataset {
  restaurants: Restaurant[];
  orders: NormalizedOrder[];
  /** Zakres dat, za który dane są kompletne (z historii importów). */
  coverage: { from: string; to: string };
  isDemo: boolean;
}

export type RangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  /** YYYY-MM-DD, włącznie. */
  from: string;
  to: string;
}

export interface Filters {
  preset: RangePreset;
  range: DateRange;
  restaurantId: string | "all";
  platforms: PlatformId[];
}
