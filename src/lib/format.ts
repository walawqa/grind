import { toDate } from "./dates";

const pln = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plnCompact = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

const int = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export const NO_DATA = "Brak danych";

/** Kwota w PLN. `null` → „Brak danych”, nigdy „0,00 zł”. */
export function formatPLN(value: number | null | undefined, opts?: { compact?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NO_DATA;
  return (opts?.compact ? plnCompact : pln).format(value);
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NO_DATA;
  return int.format(value);
}

/** Zmiana procentowa ze znakiem, np. „+12,4%”. */
export function formatDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0.05 ? "+" : pct < -0.05 ? "−" : "";
  return `${sign}${Math.abs(pct).toLocaleString("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return NO_DATA;
  return `${(value * 100).toLocaleString("pl-PL", { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

/** Oś wykresu: „1,2 tys. zł”. */
export function formatAxisPLN(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} tys.`;
  }
  return int.format(value);
}

const dayMonth = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayDate = new Intl.DateTimeFormat("pl-PL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDayMonth(iso: string): string {
  return dayMonth.format(toDate(iso)).replace(".", "");
}

export function formatFullDate(iso: string): string {
  return fullDate.format(toDate(iso));
}

export function formatWeekdayDate(iso: string): string {
  return weekdayDate.format(toDate(iso));
}

export function formatRange(from: string, to: string): string {
  return `${formatDayMonth(from)} – ${formatFullDate(to)}`;
}

export function formatDateTime(isoDateTime: string): string {
  // order_datetime jest już zapisane w czasie lokalnym lokalu.
  const [d, t] = isoDateTime.split("T");
  return `${d.split("-").reverse().join(".")} ${t?.slice(0, 5) ?? ""}`;
}
