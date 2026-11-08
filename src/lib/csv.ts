/**
 * Eksport CSV z ochroną przed „formula injection” (CSV injection).
 * Komórki zaczynające się od = + - @ tab lub CR są poprzedzane apostrofem.
 * Separator „;” — domyślny dla polskiego Excela.
 */

const DANGEROUS = /^[=+\-@\t\r]/;

export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "number" ? value.toString().replace(".", ",") : String(value);
  // Liczby ujemne zostawiamy jako liczby (Excel nie traktuje ich jak formuł).
  if (DANGEROUS.test(s) && !(typeof value === "number")) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][], delimiter = ";"): string {
  const lines = [headers.map(sanitizeCell).join(delimiter)];
  for (const r of rows) lines.push(r.map(sanitizeCell).join(delimiter));
  // BOM, aby Excel poprawnie rozpoznał UTF-8 i polskie znaki.
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
