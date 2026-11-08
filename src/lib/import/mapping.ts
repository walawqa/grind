/**
 * Mapowanie kolumn eksportu na pola znormalizowanego zamówienia
 * oraz parsowanie polskich formatów liczb i dat.
 * Słowniki synonimów są rozszerzalne — eksporty platform mają różne formaty
 * i nie zakładamy żadnego „oficjalnego” układu kolumn.
 */
import { z } from "zod";

export type TargetField =
  | "order_datetime"
  | "external_order_id"
  | "order_status"
  | "gross_sales"
  | "currency"
  | "commission_amount"
  | "other_platform_fees"
  | "discount_amount"
  | "refund_amount";

export interface FieldDef {
  field: TargetField;
  label: string;
  required: boolean;
  synonyms: string[];
}

export const FIELD_DEFS: FieldDef[] = [
  { field: "order_datetime", label: "Data i godzina zamówienia", required: true, synonyms: ["data", "date", "data zamowienia", "order date", "created at", "order time", "czas zamowienia", "data i godzina", "datetime"] },
  { field: "external_order_id", label: "ID zamówienia", required: false, synonyms: ["id", "order id", "id zamowienia", "numer zamowienia", "order number", "nr zamowienia", "order reference", "order_id"] },
  { field: "order_status", label: "Status", required: false, synonyms: ["status", "order status", "status zamowienia", "state"] },
  { field: "gross_sales", label: "Kwota sprzedaży", required: true, synonyms: ["kwota", "wartosc", "wartosc zamowienia", "total", "gross", "subtotal", "amount", "sales", "order value", "kwota brutto", "suma", "przychod", "sprzedaz"] },
  { field: "currency", label: "Waluta", required: false, synonyms: ["waluta", "currency", "curr"] },
  { field: "commission_amount", label: "Prowizja", required: false, synonyms: ["prowizja", "commission", "fee", "marketplace fee", "oplata platformy", "service fee"] },
  { field: "other_platform_fees", label: "Inne opłaty", required: false, synonyms: ["inne oplaty", "other fees", "oplaty dodatkowe", "adjustments", "dodatkowe oplaty"] },
  { field: "discount_amount", label: "Rabat", required: false, synonyms: ["rabat", "discount", "promocja", "promotion", "znizka", "promo"] },
  { field: "refund_amount", label: "Zwrot", required: false, synonyms: ["zwrot", "refund", "korekta", "refunds", "zwroty"] },
];

export type Mapping = Partial<Record<TargetField, number>>;

/** Normalizacja nagłówka: małe litery, bez polskich znaków i interpunkcji. */
export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[_\-./()[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Automatyczne sugestie mapowania na podstawie nagłówków (najpierw dopasowania dokładne). */
export function suggestMapping(headers: string[]): Mapping {
  const norm = headers.map(normalizeHeader);
  const used = new Set<number>();
  const mapping: Mapping = {};
  for (const pass of ["exact", "contains"] as const) {
    for (const def of FIELD_DEFS) {
      if (mapping[def.field] !== undefined) continue;
      const idx = norm.findIndex(
        (h, i) =>
          !used.has(i) &&
          def.synonyms.some((s) => (pass === "exact" ? h === s : h.includes(s) && s.length >= 4)),
      );
      if (idx >= 0) {
        mapping[def.field] = idx;
        used.add(idx);
      }
    }
  }
  return mapping;
}

/** „1 234,56 zł”, „1.234,56”, „-12.5 PLN” → liczba; puste → null; błąd → NaN. */
export function parseNumberPL(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  let s = raw.trim().replace(/\s| /g, "").replace(/zł|pln/gi, "");
  if (s === "" || s === "-") return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // ostatni separator jest dziesiętny
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return Number.NaN;
  return Number(s);
}

/**
 * Obsługiwane: „2026-11-03 18:45”, „2026-11-03T18:45:00”, „03.11.2026 18:45”, „03/11/2026”.
 * Zwraca lokalny czas lokalu „YYYY-MM-DDTHH:mm:00” albo null przy błędzie.
 * Znacznik strefy (Z / +01:00) jest przeliczany na Europe/Warsaw.
 */
export function parseDatePL(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
    return parts.replace(" ", "T") + ":00";
  }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::\d{2})?)?$/);
  let y, mo, d, h, mi;
  if (m) [, y, mo, d, h = "0", mi = "0"] = m;
  else {
    m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?)?$/);
    if (!m) return null;
    [, d, mo, y, h = "0", mi = "0"] = m;
  }
  const yi = Number(y), moi = Number(mo), di = Number(d), hi = Number(h), mii = Number(mi);
  const check = new Date(Date.UTC(yi, moi - 1, di));
  if (check.getUTCMonth() !== moi - 1 || check.getUTCDate() !== di || hi > 23 || mii > 59) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${yi}-${p(moi)}-${p(di)}T${p(hi)}:${p(mii)}:00`;
}

const STATUS_MAP: Record<string, "completed" | "cancelled"> = {
  completed: "completed", delivered: "completed", zrealizowane: "completed", dostarczone: "completed",
  zakonczone: "completed", done: "completed", ok: "completed",
  cancelled: "cancelled", canceled: "cancelled", anulowane: "cancelled", odrzucone: "cancelled", rejected: "cancelled",
};

export function parseStatus(raw: string | undefined): "completed" | "cancelled" | null {
  if (raw === undefined || raw.trim() === "") return "completed";
  return STATUS_MAP[normalizeHeader(raw)] ?? null;
}

export const RowSchema = z.object({
  order_datetime: z.string(),
  external_order_id: z.string().nullable(),
  order_status: z.enum(["completed", "cancelled"]),
  gross_sales: z.number().finite().nonnegative(),
  currency: z.literal("PLN"),
  commission_amount: z.number().finite().nonnegative().nullable(),
  other_platform_fees: z.number().finite().nullable(),
  discount_amount: z.number().finite().nonnegative().nullable(),
  refund_amount: z.number().finite().nonnegative().nullable(),
});

export type ParsedRow = z.infer<typeof RowSchema>;

export interface RowError {
  row: number;
  messages: string[];
}

export interface ValidationSummary {
  valid: ParsedRow[];
  errors: RowError[];
  duplicateIds: number;
  missingRequired: TargetField[];
}

/** Walidacja „na sucho” — bez zapisu. `row` to numer wiersza w pliku (nagłówek = 1). */
export function validateRows(rows: string[][], mapping: Mapping): ValidationSummary {
  const missingRequired = FIELD_DEFS.filter((f) => f.required && mapping[f.field] === undefined).map((f) => f.field);
  if (missingRequired.length) return { valid: [], errors: [], duplicateIds: 0, missingRequired };

  const get = (r: string[], f: TargetField) => (mapping[f] === undefined ? undefined : r[mapping[f]!]);
  const seen = new Set<string>();
  let duplicateIds = 0;
  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((r, i) => {
    const msgs: string[] = [];
    const dt = parseDatePL(get(r, "order_datetime"));
    if (!dt) msgs.push("Niepoprawna data");
    const gross = parseNumberPL(get(r, "gross_sales"));
    if (gross === null) msgs.push("Brak kwoty sprzedaży");
    else if (Number.isNaN(gross)) msgs.push("Kwota nie jest liczbą");
    else if (gross < 0) msgs.push("Ujemna kwota sprzedaży");
    const curRaw = (get(r, "currency") ?? "PLN").trim().toUpperCase() || "PLN";
    const currency = curRaw === "ZŁ" || curRaw === "ZL" ? "PLN" : curRaw;
    if (currency !== "PLN") msgs.push(`Nieobsługiwana waluta: ${curRaw}`);
    const status = parseStatus(get(r, "order_status"));
    if (!status) msgs.push(`Nieznany status: ${get(r, "order_status")}`);
    const optNum = (f: TargetField, label: string, allowNegative = false) => {
      const v = parseNumberPL(get(r, f));
      if (v === null) return null;
      if (Number.isNaN(v)) {
        msgs.push(`${label}: niepoprawna liczba`);
        return null;
      }
      if (!allowNegative && v < 0) {
        // niektóre platformy zapisują potrącenia jako wartości ujemne
        return Math.abs(v);
      }
      return v;
    };
    const commission = optNum("commission_amount", "Prowizja");
    const other = optNum("other_platform_fees", "Inne opłaty", true);
    const discount = optNum("discount_amount", "Rabat");
    const refund = optNum("refund_amount", "Zwrot");
    const id = get(r, "external_order_id")?.trim() || null;
    if (id) {
      if (seen.has(id)) {
        duplicateIds++;
        return;
      }
      seen.add(id);
    }
    if (msgs.length) {
      errors.push({ row: i + 2, messages: msgs });
      return;
    }
    const parsed = RowSchema.safeParse({
      order_datetime: dt,
      external_order_id: id,
      order_status: status,
      gross_sales: gross,
      currency,
      commission_amount: commission,
      other_platform_fees: other,
      discount_amount: discount,
      refund_amount: refund,
    });
    if (parsed.success) valid.push(parsed.data);
    else errors.push({ row: i + 2, messages: parsed.error.issues.map((x) => x.message) });
  });

  return { valid, errors, duplicateIds, missingRequired };
}

const AGGREGATE_HINTS = ["liczba zamowien", "ilosc zamowien", "orders count", "number of orders", "order count", "zamowienia lacznie"];

/**
 * Czy plik wygląda na raport zbiorczy (np. dzienny), a nie listę zamówień?
 * Takich wierszy NIE wolno liczyć jako zamówień.
 */
export function looksLikeAggregate(headers: string[]): boolean {
  return headers.map(normalizeHeader).some((h) => AGGREGATE_HINTS.some((a) => h.includes(a)));
}
