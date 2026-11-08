"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent, formatPLN, NO_DATA } from "@/lib/format";
import type { PlatformRow } from "@/lib/kpi";
import { PLATFORMS } from "@/lib/platforms";
import { DeltaBadge } from "./delta";

type SortKey = "platform" | "orders" | "sales" | "aov" | "fees" | "delta";

const COLS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "platform", label: "Platforma" },
  { key: "orders", label: "Zamówienia", align: "right" },
  { key: "sales", label: "Sprzedaż", align: "right" },
  { key: "aov", label: "Średni koszyk", align: "right" },
  { key: "fees", label: "Prowizje i opłaty", align: "right" },
  { key: "delta", label: "Zmiana sprzedaży", align: "right" },
];

function sortValue(r: PlatformRow, k: SortKey): number | string | null {
  if (k === "platform") return PLATFORMS[r.platform].label;
  return r[k];
}

export function FeeCell({ row }: { row: PlatformRow }) {
  if (row.fees === null) return <span className="text-subtle">{NO_DATA}</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <span className="flex items-center gap-1.5">
        {row.feeKind !== "actual" ? (
          <Badge tone="warning" className="px-1.5 py-0 text-[10.5px]" title="Wartość szacunkowa wg stawek z ustawień">
            szac.
          </Badge>
        ) : null}
        <span className="tabular text-text">{formatPLN(row.fees)}</span>
      </span>
      <span className="tabular text-[11.5px] text-subtle">{formatPercent(row.feeRate)} sprzedaży</span>
    </span>
  );
}

export function PlatformTable({
  rows,
  title = "Porównanie platform",
  subtitle = "Wyniki w wybranym okresie i zmiana wobec poprzedniego okresu",
  action,
}: {
  rows: PlatformRow[];
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "sales", dir: "desc" });
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      // puste wartości zawsze na końcu
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const c = typeof va === "string" ? va.localeCompare(vb as string, "pl") : (va as number) - (vb as number);
      return sort.dir === "asc" ? c : -c;
    });
    return out;
  }, [rows, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "platform" ? "asc" : "desc" }));

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          action ?? (
            <InfoTip content="„szac.” oznacza opłaty estymowane według stawek z Ustawień, bo plik platformy nie zawierał prowizji. „Brak danych” — brak prowizji w pliku i brak stawki." />
          )
        }
      />
      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-subtle">Brak danych w wybranym zakresie.</p>
      ) : (
        <>
          {/* desktop / tablet */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead>
                <tr className="border-y border-border-subtle bg-bg-elevated/40">
                  {COLS.map((c) => {
                    const active = sort.key === c.key;
                    const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
                    return (
                      <th
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={cn("px-5 py-2.5 font-medium", c.align === "right" ? "text-right" : "text-left")}
                      >
                        <button
                          onClick={() => toggle(c.key)}
                          className={cn(
                            "inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.04em] transition-colors",
                            active ? "text-text" : "text-subtle hover:text-muted",
                          )}
                        >
                          {c.label}
                          <Icon className="size-3" />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.platform} className="border-b border-border-subtle/70 transition-colors last:border-0 hover:bg-surface-hover/50">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-3">
                        <span
                          className="flex size-8 items-center justify-center rounded-[10px] text-[12px] font-semibold"
                          style={{ background: `${PLATFORMS[r.platform].color}1f`, color: PLATFORMS[r.platform].color }}
                        >
                          {PLATFORMS[r.platform].label.slice(0, 1)}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium text-text">{PLATFORMS[r.platform].label}</span>
                          <span className="text-[12px] text-subtle">{formatPercent(r.share)} udziału</span>
                        </span>
                      </span>
                    </td>
                    <td className="tabular px-5 py-3.5 text-right text-text">{formatInt(r.orders)}</td>
                    <td className="tabular px-5 py-3.5 text-right font-medium text-text">{formatPLN(r.sales)}</td>
                    <td className="tabular px-5 py-3.5 text-right text-text">{formatPLN(r.aov)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <FeeCell row={r} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.delta === null ? <span className="text-[12.5px] text-subtle">{NO_DATA}</span> : <DeltaBadge value={r.delta} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* mobile: karty */}
          <ul className="mt-4 flex flex-col gap-2 px-4 pb-4 md:hidden">
            {sorted.map((r) => (
              <li key={r.platform} className="rounded-2xl border border-border-subtle bg-bg-elevated/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5">
                    <span className="size-2.5 rounded-full" style={{ background: PLATFORMS[r.platform].color }} />
                    <span className="font-medium text-text">{PLATFORMS[r.platform].label}</span>
                  </span>
                  {r.delta === null ? <span className="text-[12px] text-subtle">{NO_DATA}</span> : <DeltaBadge value={r.delta} />}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
                  <div>
                    <dt className="text-[11.5px] text-subtle">Sprzedaż</dt>
                    <dd className="tabular font-medium text-text">{formatPLN(r.sales)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] text-subtle">Zamówienia</dt>
                    <dd className="tabular text-text">{formatInt(r.orders)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] text-subtle">Średni koszyk</dt>
                    <dd className="tabular text-text">{formatPLN(r.aov)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] text-subtle">Prowizje i opłaty</dt>
                    <dd className="[&>span]:items-start">
                      <FeeCell row={r} />
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
