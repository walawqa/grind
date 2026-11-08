/**
 * Generuje przykładowe pliki CSV do testów importu (public/samples).
 * WSZYSTKIE DANE SĄ SYNTETYCZNE. Układy kolumn są wymyślone —
 * NIE odwzorowują oficjalnych eksportów żadnej platformy.
 *
 * Uruchom: npm run samples
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateDemoDataset } from "../src/lib/demo/generate";
import { netSales } from "../src/lib/kpi";

const OUT = join(process.cwd(), "public", "samples");
mkdirSync(OUT, { recursive: true });

const END = "2026-10-31";
const ds = generateDemoDataset(END, 30);
const centrum = ds.orders.filter((o) => o.restaurant_id === "rest_demo_centrum");
const NOTE = "DANE TESTOWE - syntetyczne";

const pl = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));
const plDate = (dt: string) => {
  const [d, t] = dt.split("T");
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y} ${t.slice(0, 5)}`;
};
const csvLine = (cells: (string | number)[], sep: string) =>
  cells
    .map((c) => {
      const s = String(c);
      return s.includes(sep) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(sep);
const write = (name: string, header: string[], rows: (string | number)[][], sep: string) => {
  const content = "﻿" + [csvLine(header, sep), ...rows.map((r) => csvLine(r, sep))].join("\r\n") + "\r\n";
  writeFileSync(join(OUT, name), content, "utf8");
  console.log(`✓ ${name} (${rows.length} wierszy)`);
};

// 1. Zamówienia — format A: polskie nagłówki, „;”, przecinek dziesiętny, dd.mm.rrrr
write(
  "TESTOWE-zamowienia-format-A-glovo.csv",
  ["Numer zamówienia", "Data zamówienia", "Status", "Wartość zamówienia", "Rabat", "Zwrot", "Prowizja", "Waluta", "Uwagi"],
  centrum
    .filter((o) => o.platform === "glovo")
    .map((o) => [
      o.external_order_id!,
      plDate(o.order_datetime),
      o.order_status === "completed" ? "Zrealizowane" : "Anulowane",
      pl(o.gross_sales),
      pl(o.discount_amount),
      pl(o.refund_amount),
      pl(o.commission_amount),
      "PLN",
      NOTE,
    ]),
  ";",
);

// 2. Zamówienia — format B: angielskie nagłówki, „,”, kropka dziesiętna, czas UTC (ISO 8601)
const toUtc = (dt: string) => {
  // czas lokalny Europe/Warsaw → UTC (październik: +2 do 25.10, potem +1)
  const d = new Date(`${dt}${dt.slice(0, 10) < "2026-10-25" ? "+02:00" : "+01:00"}`);
  return d.toISOString().replace(".000", "");
};
write(
  "TESTOWE-zamowienia-format-B-ubereats.csv",
  ["Order ID", "Order Date", "Order Status", "Subtotal", "Promotion", "Refund", "Marketplace Fee", "Currency", "Notes"],
  centrum
    .filter((o) => o.platform === "ubereats")
    .map((o) => [
      o.external_order_id!,
      toUtc(o.order_datetime),
      o.order_status === "completed" ? "delivered" : "cancelled",
      o.gross_sales.toFixed(2),
      o.discount_amount?.toFixed(2) ?? "",
      o.refund_amount?.toFixed(2) ?? "",
      o.commission_amount?.toFixed(2) ?? "",
      "PLN",
      NOTE,
    ]),
  ",",
);

// 3. Zamówienia bez prowizji (Pyszne.pl) — do testu estymacji opłat
write(
  "TESTOWE-zamowienia-bez-prowizji-pyszne.csv",
  ["ID zamówienia", "Data", "Status", "Kwota", "Rabat", "Uwagi"],
  centrum
    .filter((o) => o.platform === "pyszne")
    .map((o) => [
      o.external_order_id!,
      plDate(o.order_datetime),
      o.order_status === "completed" ? "dostarczone" : "anulowane",
      pl(o.gross_sales),
      pl(o.discount_amount),
      NOTE,
    ]),
  ";",
);

// 4. Raport dzienny (zbiorczy) — wiersz = dzień, NIE zamówienie
const byDay = new Map<string, { orders: number; sales: number; commission: number }>();
for (const o of centrum.filter((x) => x.platform === "wolt" && x.order_status === "completed")) {
  const d = byDay.get(o.order_date) ?? { orders: 0, sales: 0, commission: 0 };
  d.orders += 1;
  d.sales += netSales(o);
  d.commission += o.commission_amount ?? 0;
  byDay.set(o.order_date, d);
}
write(
  "TESTOWE-raport-dzienny-wolt.csv",
  ["Data", "Liczba zamówień", "Sprzedaż", "Prowizja", "Waluta", "Uwagi"],
  [...byDay.entries()].map(([d, v]) => [d, v.orders, pl(v.sales), pl(v.commission), "PLN", NOTE]),
  ";",
);

// 5. Plik z błędnymi wierszami — do testu walidacji
write(
  "TESTOWE-bledne-wiersze.csv",
  ["Numer zamówienia", "Data zamówienia", "Status", "Wartość zamówienia", "Prowizja", "Waluta", "Uwagi"],
  [
    ["T-0001", "03.10.2026 12:15", "Zrealizowane", "54,90", "15,37", "PLN", "poprawny"],
    ["T-0002", "03.10.2026 13:02", "Zrealizowane", "1 249,00", "", "PLN", "poprawny, kwota z separatorem tysięcy, brak prowizji"],
    ["T-0002", "03.10.2026 13:02", "Zrealizowane", "1 249,00", "", "PLN", "BŁĄD: duplikat ID"],
    ["T-0003", "31.09.2026 18:40", "Zrealizowane", "62,00", "17,36", "PLN", "BŁĄD: nieistniejąca data"],
    ["T-0004", "04.10.2026 19:10", "Zrealizowane", "-35,00", "0", "PLN", "BŁĄD: ujemna kwota sprzedaży"],
    ["T-0005", "04.10.2026 19:45", "Zrealizowane", "48,50", "13,58", "EUR", "BŁĄD: nieobsługiwana waluta"],
    ["T-0006", "05.10.2026 20:05", "Zrealizowane", "", "", "PLN", "BŁĄD: brak kwoty"],
    ["T-0007", "05.10.2026 20:30", "W drodze", "71,20", "19,94", "PLN", "BŁĄD: nieznany status"],
    ["T-0008", "06.10.2026 12:00", "Zrealizowane", "sześćdziesiąt", "", "PLN", "BŁĄD: tekst zamiast liczby"],
    ["T-0009", "06.10.2026 12:30", "Anulowane", "39,90", "", "PLN", "poprawny, anulowane"],
    ["", "06.10.2026 13:00", "Zrealizowane", "44,00", "12,32", "PLN", "poprawny, brak ID"],
  ].map((r) => [...r.slice(0, 6), `${NOTE} | ${r[6]}`]),
  ";",
);
