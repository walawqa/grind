/**
 * Parser CSV (RFC 4180) z wykrywaniem separatora: „,”, „;” lub tabulator.
 * Obsługuje cudzysłowy, podwojone cudzysłowy, znaki nowej linii w polach i BOM UTF-8.
 */

export type Delimiter = "," | ";" | "\t";

export interface ParsedCsv {
  delimiter: Delimiter;
  headers: string[];
  rows: string[][];
}

export function detectDelimiter(sample: string): Delimiter {
  const firstLines = sample.split(/\r?\n/).slice(0, 5);
  const candidates: Delimiter[] = [";", ",", "\t"];
  let best: Delimiter = ",";
  let bestScore = -1;
  for (const d of candidates) {
    const counts = firstLines.map((l) => countOutsideQuotes(l, d));
    const min = Math.min(...counts);
    // separator powinien występować w każdej linii i najlepiej tyle samo razy
    const consistent = counts.every((c) => c === counts[0]);
    const score = min * (consistent ? 2 : 1);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, d: string): number {
  let inQ = false;
  let n = 0;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === d && !inQ) n++;
  }
  return n;
}

export function parseCsv(text: string, delimiter?: Delimiter): ParsedCsv {
  const src = text.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQ = true;
    else if (ch === d) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  const [headers = [], ...data] = rows;
  return { delimiter: d, headers: headers.map((h) => h.trim()), rows: data };
}
