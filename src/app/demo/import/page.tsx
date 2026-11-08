"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Info,
  RotateCcw,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatPLN, formatRange } from "@/lib/format";
import { FIELD_DEFS, looksLikeAggregate, suggestMapping, validateRows, type Mapping, type TargetField } from "@/lib/import/mapping";
import { parseCsv, type ParsedCsv } from "@/lib/import/parse-csv";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const PREVIEW_ROWS = 15;

const SAMPLES = [
  { file: "TESTOWE-zamowienia-format-A-glovo.csv", label: "Zamówienia — format A", desc: "Polskie nagłówki, separator „;”, przecinek dziesiętny" },
  { file: "TESTOWE-zamowienia-format-B-ubereats.csv", label: "Zamówienia — format B", desc: "Angielskie nagłówki, „,”, czas UTC" },
  { file: "TESTOWE-zamowienia-bez-prowizji-pyszne.csv", label: "Zamówienia bez prowizji", desc: "Test estymacji opłat wg stawek" },
  { file: "TESTOWE-raport-dzienny-wolt.csv", label: "Raport dzienny (zbiorczy)", desc: "Wiersz = dzień, nie zamówienie" },
  { file: "TESTOWE-bledne-wiersze.csv", label: "Błędne wiersze", desc: "Test walidacji i duplikatów" },
];

interface Loaded {
  name: string;
  size: number;
  parsed: ParsedCsv;
}

export default function ImportPage() {
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader
        title="Import danych"
        subtitle="Wgraj eksport CSV z panelu platformy i sprawdź, jak zostanie odczytany"
        filters={false}
        importButton={false}
      />
      <div className="flex items-start gap-3 rounded-2xl border border-[rgba(34,211,238,0.22)] bg-[rgba(34,211,238,0.06)] px-4 py-3 text-[13px] text-text">
        <Info className="mt-0.5 size-4 shrink-0 text-cyan" />
        <p>
          <span className="font-medium">Wersja podglądowa (Etap 1):</span> plik jest analizowany wyłącznie w Twojej
          przeglądarce — nic nie jest wysyłane ani zapisywane. Zapis do bazy, obsługa XLSX, deduplikacja między importami i
          historia importów dojdą w Etapie 3.
        </p>
      </div>
      <Importer />
      <SamplesCard />
      <HistoryCard />
    </div>
  );
}

function Importer() {
  const { dataset } = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [platform, setPlatform] = useState<PlatformId>("glovo");
  const [restaurantId, setRestaurantId] = useState<string>("");

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError(
        /\.xlsx?$/i.test(file.name)
          ? "Pliki XLSX obsłużymy w Etapie 3. Na razie zapisz arkusz jako CSV (UTF-8)."
          : "Nieobsługiwany typ pliku. Wybierz plik .csv.",
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Plik jest większy niż 10 MB.");
      return;
    }
    try {
      const text = await file.text();
      if (text.includes("�")) {
        setError("Plik nie jest zapisany w kodowaniu UTF-8. Zapisz go ponownie jako „CSV UTF-8”.");
        return;
      }
      const parsed = parseCsv(text);
      if (parsed.headers.length < 2 || parsed.rows.length === 0) {
        setError("Nie znaleziono nagłówków lub wierszy z danymi.");
        return;
      }
      setLoaded({ name: file.name, size: file.size, parsed });
      setMapping(suggestMapping(parsed.headers));
      const guess = PLATFORM_ORDER.find((p) => file.name.toLowerCase().includes(p === "ubereats" ? "uber" : p));
      if (guess) setPlatform(guess);
    } catch {
      setError("Nie udało się odczytać pliku.");
    }
  }, []);

  const aggregate = loaded ? looksLikeAggregate(loaded.parsed.headers) : false;
  const summary = useMemo(
    () => (loaded && !aggregate ? validateRows(loaded.parsed.rows, mapping) : null),
    [loaded, mapping, aggregate],
  );

  if (!loaded) {
    return (
      <Card className="p-5 sm:p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center transition-colors duration-[var(--dur)]",
            drag ? "border-accent bg-[var(--accent-bg)]" : "border-border-strong bg-bg-elevated/40",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-bg)] text-accent-soft">
            <UploadCloud className="size-6" strokeWidth={1.7} />
          </span>
          <p className="mt-4 text-[15px] font-medium text-text">Przeciągnij plik CSV tutaj</p>
          <p className="mt-1 text-[13px] text-muted">lub wybierz z dysku · maks. 10 MB · separator „,” lub „;” · UTF-8</p>
          <Button variant="primary" className="mt-5" onClick={() => inputRef.current?.click()}>
            <FileUp />
            Wybierz plik
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="Wybierz plik CSV"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="mt-4 flex items-center gap-2 text-[13px] text-negative">
            <XCircle className="size-4" />
            {error}
          </p>
        ) : null}
      </Card>
    );
  }

  const { parsed } = loaded;
  const mapped = new Map(Object.entries(mapping).map(([f, i]) => [i, f as TargetField]));

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-accent-soft">
              <FileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-text">{loaded.name}</p>
              <p className="text-[12.5px] text-muted">
                {(loaded.size / 1024).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} KB ·{" "}
                {parsed.rows.length.toLocaleString("pl-PL")} wierszy · separator „{parsed.delimiter === "\t" ? "tab" : parsed.delimiter}”
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SelectField label="Platforma" value={platform} onChange={(v) => setPlatform(v as PlatformId)}>
              {PLATFORM_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PLATFORMS[p].label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Lokal" value={restaurantId} onChange={setRestaurantId}>
              <option value="">Wybierz lokal…</option>
              {dataset?.restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </SelectField>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLoaded(null);
                setMapping({});
              }}
            >
              <RotateCcw />
              Inny plik
            </Button>
          </div>
        </div>
      </Card>

      {aggregate ? (
        <div className="flex items-start gap-3 rounded-2xl border border-[rgba(245,180,84,0.28)] bg-[var(--warning-bg)] px-4 py-3 text-[13px] text-text">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            <span className="font-medium">To wygląda na raport zbiorczy</span> (kolumna z liczbą zamówień). Wiersze tego
            pliku to okresy, a nie zamówienia — nie policzymy ich jako zamówień. Import raportów zbiorczych do osobnego
            modelu danych dodamy w Etapie 3.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader
            title="Mapowanie kolumn"
            subtitle="Sugestie na podstawie nagłówków — możesz je poprawić"
          />
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {FIELD_DEFS.map((def) => (
              <label key={def.field} className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                  {def.label}
                  {def.required ? <span className="text-accent-soft">*</span> : <span className="text-subtle">(opcjonalne)</span>}
                </span>
                <select
                  value={mapping[def.field] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMapping((m) => {
                      const next = { ...m };
                      if (v === "") delete next[def.field];
                      else {
                        // jedna kolumna = jedno pole
                        for (const k of Object.keys(next) as TargetField[]) if (next[k] === Number(v)) delete next[k];
                        next[def.field] = Number(v);
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    "h-9 rounded-[10px] border bg-bg-elevated px-2.5 text-[13px] text-text focus:border-accent focus:outline-none",
                    def.required && mapping[def.field] === undefined ? "border-[rgba(251,113,133,0.5)]" : "border-border",
                  )}
                >
                  <option value="">— nie mapuj —</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Kolumna ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Card>
      )}

      {summary ? <ValidationCard summary={summary} restaurantChosen={!!restaurantId} /> : null}

      <Card className="overflow-hidden">
        <CardHeader title="Podgląd pliku" subtitle={`Pierwsze ${Math.min(PREVIEW_ROWS, parsed.rows.length)} wierszy`} />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-y border-border-subtle bg-bg-elevated/40">
                <th className="px-3 py-2 text-left font-medium text-subtle">#</th>
                {parsed.headers.map((h, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                    <span className="text-muted">{h}</span>
                    {mapped.has(i) ? (
                      <Badge tone="accent" className="ml-2 py-0 text-[10.5px]">
                        {FIELD_DEFS.find((f) => f.field === mapped.get(i))?.label}
                      </Badge>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, PREVIEW_ROWS).map((r, ri) => (
                <tr key={ri} className="border-b border-border-subtle/60 last:border-0">
                  <td className="tabular px-3 py-2 text-subtle">{ri + 2}</td>
                  {parsed.headers.map((_, ci) => (
                    <td key={ci} className={cn("tabular whitespace-nowrap px-3 py-2", mapped.has(ci) ? "text-text" : "text-subtle")}>
                      {r[ci] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ValidationCard({
  summary,
  restaurantChosen,
}: {
  summary: ReturnType<typeof validateRows>;
  restaurantChosen: boolean;
}) {
  if (summary.missingRequired.length) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[rgba(251,113,133,0.3)] bg-[var(--negative-bg)] px-4 py-3 text-[13px] text-text">
        <XCircle className="mt-0.5 size-4 shrink-0 text-negative" />
        Zmapuj wymagane pola:{" "}
        {summary.missingRequired.map((f) => FIELD_DEFS.find((d) => d.field === f)?.label).join(", ")}.
      </div>
    );
  }
  const completed = summary.valid.filter((r) => r.order_status === "completed");
  const sales = completed.reduce((s, r) => s + r.gross_sales - (r.discount_amount ?? 0) - (r.refund_amount ?? 0), 0);
  const withCommission = completed.filter((r) => r.commission_amount !== null).length;
  const dates = summary.valid.map((r) => r.order_datetime.slice(0, 10)).sort();
  const noId = summary.valid.filter((r) => !r.external_order_id).length;

  const stats = [
    { label: "Poprawne wiersze", value: summary.valid.length, tone: "text-positive", icon: CheckCircle2 },
    { label: "Pominięte duplikaty", value: summary.duplicateIds, tone: "text-warning", icon: AlertTriangle },
    { label: "Wiersze z błędami", value: summary.errors.length, tone: "text-negative", icon: XCircle },
  ];

  return (
    <Card>
      <CardHeader title="Wynik walidacji" subtitle="Symulacja importu — bez zapisu" />
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border-subtle bg-bg-elevated/50 p-4">
            <span className={cn("flex items-center gap-2 text-[12.5px]", s.tone)}>
              <s.icon className="size-4" />
              {s.label}
            </span>
            <p className="tabular mt-1.5 text-[22px] font-semibold text-text">{s.value.toLocaleString("pl-PL")}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-x-8 gap-y-2 border-t border-border-subtle px-5 py-4 text-[13px] sm:grid-cols-2">
        <p className="text-muted">
          Okres danych:{" "}
          <span className="text-text">{dates.length ? formatRange(dates[0], dates[dates.length - 1]) : "—"}</span>
        </p>
        <p className="text-muted">
          Sprzedaż (zrealizowane): <span className="tabular text-text">{formatPLN(sales)}</span>
        </p>
        <p className="text-muted">
          Prowizje w pliku:{" "}
          <span className="text-text">
            {withCommission === completed.length && completed.length
              ? "tak, dla wszystkich zamówień"
              : withCommission === 0
                ? "brak — opłaty będą szacowane wg stawek z Ustawień"
                : `częściowo (${withCommission} z ${completed.length})`}
          </span>
        </p>
        <p className="text-muted">
          Wiersze bez ID zamówienia: <span className="text-text">{noId}</span>
          {noId ? <span className="text-subtle"> — deduplikacja po kluczu złożonym (Etap 3)</span> : null}
        </p>
      </div>
      {summary.errors.length ? (
        <div className="border-t border-border-subtle px-5 py-4">
          <p className="text-[13px] font-medium text-text">Błędy (pierwsze 10)</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
            {summary.errors.slice(0, 10).map((e) => (
              <li key={e.row} className="flex gap-3">
                <span className="tabular w-16 shrink-0 text-subtle">Wiersz {e.row}</span>
                <span className="text-negative">{e.messages.join(" · ")}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 border-t border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] text-subtle">
          {restaurantChosen ? "Zapis importu będzie dostępny po podłączeniu bazy danych (Etap 2–3)." : "Wybierz lokal, do którego należy plik."}
        </p>
      </div>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] text-muted">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-[10px] border border-border bg-bg-elevated px-2.5 text-[13px] text-text focus:border-accent focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function SamplesCard() {
  return (
    <Card>
      <CardHeader
        title="Przykładowe pliki testowe"
        subtitle="Syntetyczne dane i wymyślone układy kolumn — nie są to oficjalne formaty eksportu platform"
      />
      <ul className="mt-3 divide-y divide-border-subtle">
        {SAMPLES.map((s) => (
          <li key={s.file} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-text">{s.label}</p>
              <p className="truncate text-[12.5px] text-muted">{s.desc}</p>
            </div>
            <a
              href={`/samples/${s.file}`}
              download
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-border px-3 py-1.5 text-[12.5px] font-medium text-text transition-colors hover:bg-surface-hover"
            >
              <Download className="size-3.5" />
              Pobierz
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function HistoryCard() {
  const { dataset } = useDemo();
  const rows = useMemo(() => {
    if (!dataset) return [];
    const by = new Map<string, { platform: PlatformId; count: number }>();
    for (const o of dataset.orders) {
      const e = by.get(o.import_id) ?? { platform: o.platform, count: 0 };
      e.count++;
      by.set(o.import_id, e);
    }
    return [...by.entries()].map(([id, v]) => ({ id, ...v }));
  }, [dataset]);
  if (!dataset) return null;
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Historia importów" subtitle="Dane demonstracyjne wygenerowane syntetycznie" />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead>
            <tr className="border-y border-border-subtle bg-bg-elevated/40 text-[11.5px] uppercase tracking-[0.04em] text-subtle">
              <th className="px-5 py-2.5 text-left font-medium">Źródło</th>
              <th className="px-5 py-2.5 text-left font-medium">Platforma</th>
              <th className="px-5 py-2.5 text-left font-medium">Okres danych</th>
              <th className="px-5 py-2.5 text-right font-medium">Rekordy</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle/70 last:border-0">
                <td className="px-5 py-3 text-muted">Generator demo</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-text">
                    <span className="size-2 rounded-full" style={{ background: PLATFORMS[r.platform].color }} />
                    {PLATFORMS[r.platform].label}
                  </span>
                </td>
                <td className="px-5 py-3 text-muted">{formatRange(dataset.coverage.from, dataset.coverage.to)}</td>
                <td className="tabular px-5 py-3 text-right text-text">{r.count.toLocaleString("pl-PL")}</td>
                <td className="px-5 py-3 text-right">
                  <Badge tone="accent">Demo</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
