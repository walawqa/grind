import { describe, expect, it } from "vitest";
import { parseCsv, detectDelimiter } from "@/lib/import/parse-csv";
import { parseDatePL, parseNumberPL, suggestMapping, validateRows } from "@/lib/import/mapping";
import { sanitizeCell, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("wykrywa średnik i obsługuje cudzysłowy oraz BOM", () => {
    const text = '﻿Data;Kwota;Uwagi\n03.11.2026 18:45;"1 234,50";"Tekst; z ""cudzysłowem"""\n';
    expect(detectDelimiter(text)).toBe(";");
    const p = parseCsv(text);
    expect(p.headers).toEqual(["Data", "Kwota", "Uwagi"]);
    expect(p.rows[0]).toEqual(["03.11.2026 18:45", "1 234,50", 'Tekst; z "cudzysłowem"']);
  });

  it("wykrywa przecinek", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });
});

describe("parsowanie polskich formatów", () => {
  it("liczby", () => {
    expect(parseNumberPL("1 234,56 zł")).toBe(1234.56);
    expect(parseNumberPL("1.234,56")).toBe(1234.56);
    expect(parseNumberPL("1,234.56")).toBe(1234.56);
    expect(parseNumberPL("-12,5 PLN")).toBe(-12.5);
    expect(parseNumberPL("")).toBeNull();
    expect(parseNumberPL("abc")).toBeNaN();
  });

  it("daty", () => {
    expect(parseDatePL("03.11.2026 18:45")).toBe("2026-11-03T18:45:00");
    expect(parseDatePL("2026-11-03")).toBe("2026-11-03T00:00:00");
    expect(parseDatePL("31.02.2026")).toBeNull();
    // UTC → Europe/Warsaw (listopad: UTC+1)
    expect(parseDatePL("2026-11-03T17:45:00Z")).toBe("2026-11-03T18:45:00");
  });
});

describe("mapowanie i walidacja", () => {
  it("sugeruje mapowanie po nagłówkach", () => {
    const m = suggestMapping(["Numer zamówienia", "Data zamówienia", "Status", "Wartość zamówienia", "Prowizja"]);
    expect(m.external_order_id).toBe(0);
    expect(m.order_datetime).toBe(1);
    expect(m.order_status).toBe(2);
    expect(m.gross_sales).toBe(3);
    expect(m.commission_amount).toBe(4);
  });

  it("odrzuca błędne wiersze i pomija duplikaty ID", () => {
    const rows = [
      ["A1", "03.11.2026 12:00", "zrealizowane", "50,00"],
      ["A1", "03.11.2026 12:00", "zrealizowane", "50,00"],
      ["A2", "32.11.2026", "zrealizowane", "50,00"],
      ["A3", "03.11.2026", "zrealizowane", "-5"],
      ["A4", "03.11.2026", "???", "10"],
    ];
    const res = validateRows(rows, { external_order_id: 0, order_datetime: 1, order_status: 2, gross_sales: 3 });
    expect(res.valid).toHaveLength(1);
    expect(res.duplicateIds).toBe(1);
    expect(res.errors.map((e) => e.row)).toEqual([4, 5, 6]);
  });

  it("zgłasza brak wymaganych kolumn", () => {
    const res = validateRows([["x"]], { external_order_id: 0 });
    expect(res.missingRequired).toEqual(["order_datetime", "gross_sales"]);
  });
});

describe("eksport CSV", () => {
  it("neutralizuje formuły", () => {
    expect(sanitizeCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(sanitizeCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCell(-12.5)).toBe("-12,5");
    expect(toCsv(["a"], [["b"]]).startsWith("﻿")).toBe(true);
  });
});
