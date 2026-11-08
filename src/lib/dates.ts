/**
 * Operacje na datach kalendarzowych w formacie YYYY-MM-DD.
 * Liczymy w UTC na samych datach, aby uniknąć przesunięć przy zmianie czasu (DST).
 * Strefa lokalu (Europe/Warsaw) jest stosowana wcześniej — przy normalizacji importu.
 */

const DAY_MS = 86_400_000;

export function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
}

/** Liczba dni w zakresie, włącznie z obiema granicami. */
export function daysInclusive(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / DAY_MS) + 1;
}

export function eachDay(from: string, to: string): string[] {
  const n = daysInclusive(from, to);
  return Array.from({ length: Math.max(0, n) }, (_, i) => addDays(from, i));
}

/** Dzień tygodnia 0 = poniedziałek … 6 = niedziela. */
export function weekdayIndex(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7;
}

/** Bieżąca data w strefie Europe/Warsaw (YYYY-MM-DD). */
export function todayInWarsaw(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Poprzedni okres o tej samej długości, bezpośrednio przed zakresem. */
export function previousRange(range: { from: string; to: string }) {
  const len = daysInclusive(range.from, range.to);
  return { from: addDays(range.from, -len), to: addDays(range.from, -1) };
}

export function isWithin(iso: string, range: { from: string; to: string }): boolean {
  return iso >= range.from && iso <= range.to;
}

export const WEEKDAYS_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];
export const WEEKDAYS_LONG = [
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
  "niedziela",
];
