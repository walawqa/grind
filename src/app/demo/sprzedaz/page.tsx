"use client";

import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CoverageNotice } from "@/components/dashboard/coverage-notice";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { useToast } from "@/components/providers/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Pagination } from "@/components/ui/pagination";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { downloadCsv, toCsv } from "@/lib/csv";
import { eachDay, isWithin } from "@/lib/dates";
import { formatDateTime, formatInt, formatPercent, formatPLN, formatWeekdayDate, NO_DATA } from "@/lib/format";
import { addOrder, emptyTotals, filterOrders, netSales, orderFee, type Totals } from "@/lib/kpi";
import { PLATFORMS } from "@/lib/platforms";
import type { NormalizedOrder } from "@/lib/types";

type View = "daily" | "orders";
type StatusFilter = "all" | "completed" | "cancelled";
const PAGE_SIZE = 25;

export default function SalesPage() {
  const { derived } = useDemo();
  const [view, setView] = useState<View>("daily");

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader title="Sprzedaż" subtitle="Dzienne sumy i pojedyncze zamówienia z zaimportowanych plików" />
      <CoverageNotice />
      {!derived ? (
        <Card className="p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-5 h-72 w-full" />
        </Card>
      ) : (
        <>
          <Breakdown totals={derived.kpis.current} />
          <div className="flex items-center justify-between gap-3">
            <Segmented
              ariaLabel="Widok tabeli"
              value={view}
              onChange={setView}
              options={[
                { value: "daily", label: "Dzienne sumy" },
                { value: "orders", label: "Zamówienia" },
              ]}
            />
          </div>
          {view === "daily" ? <DailyTable /> : <OrdersTable />}
        </>
      )}
    </div>
  );
}

/** Jak liczymy sprzedaż — rozbicie od wartości zamówień do sprzedaży. */
function Breakdown({ totals }: { totals: Totals }) {
  const all = totals.orders + totals.cancelled;
  const items = [
    { label: "Wartość zamówień", value: formatPLN(totals.grossBeforeDeductions), hint: "Zrealizowane zamówienia przed rabatami i zwrotami." },
    { label: "Rabaty", value: `− ${formatPLN(totals.discounts)}`, hint: "Rabaty i promocje zapisane w plikach.", tone: "text-negative" },
    { label: "Zwroty", value: `− ${formatPLN(totals.refunds)}`, hint: "Zwroty i korekty zapisane w plikach.", tone: "text-negative" },
    { label: "Sprzedaż", value: formatPLN(totals.sales), hint: "Wartość zamówień − rabaty − zwroty.", strong: true },
    { label: "Anulowane zamówienia", value: `${formatInt(totals.cancelled)} (${all ? formatPercent(totals.cancelled / all) : NO_DATA})`, hint: "Nie są wliczane do sprzedaży." },
  ];
  return (
    <Card className="grid grid-cols-2 divide-border-subtle overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
      {items.map((i) => (
        <div key={i.label} className={cn("p-4 sm:p-5", i.strong && "bg-[var(--accent-bg)]")}>
          <div className="flex items-center gap-1 text-[12.5px] text-muted">
            {i.label}
            <InfoTip content={i.hint} />
          </div>
          <p className={cn("tabular mt-1.5 text-[17px] font-semibold tracking-[-0.02em] sm:text-[19px]", i.tone ?? "text-text")}>
            {i.value}
          </p>
        </div>
      ))}
    </Card>
  );
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick}>
      <Download />
      <span className="hidden sm:inline">Eksportuj CSV</span>
      <span className="sm:hidden">CSV</span>
    </Button>
  );
}

function DailyTable() {
  const { dataset, derived, rates } = useDemo();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    if (!dataset || !derived) return [];
    const by = new Map<string, Totals>();
    for (const o of filterOrders(dataset.orders, derived.filter)) {
      if (!by.has(o.order_date)) by.set(o.order_date, emptyTotals());
      addOrder(by.get(o.order_date)!, o, rates);
    }
    return eachDay(derived.filter.range.from, derived.filter.range.to)
      .filter((d) => isWithin(d, dataset.coverage))
      .reverse()
      .map((date) => ({ date, t: by.get(date) ?? emptyTotals() }));
  }, [dataset, derived, rates]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const feesOf = (t: Totals) => (t.feesUnknownOrders > 0 ? null : t.feesActual + t.feesEstimated);

  const exportCsv = () => {
    const csv = toCsv(
      ["Data", "Zamówienia", "Anulowane", "Wartość zamówień", "Rabaty", "Zwroty", "Sprzedaż", "Średni koszyk", "Opłaty platform", "Opłaty szacowane"],
      rows.map(({ date, t }) => [
        date,
        t.orders,
        t.cancelled,
        t.grossBeforeDeductions.toFixed(2),
        t.discounts.toFixed(2),
        t.refunds.toFixed(2),
        t.sales.toFixed(2),
        t.orders ? (t.sales / t.orders).toFixed(2) : "",
        feesOf(t)?.toFixed(2) ?? "",
        t.feesEstimated > 0 ? "tak" : "nie",
      ]),
    );
    downloadCsv(`restopulse-demo-dzienne-${derived?.filter.range.from}_${derived?.filter.range.to}.csv`, csv);
    toast({ title: "Wyeksportowano CSV", description: `${rows.length} wierszy (dane demonstracyjne).` });
  };

  return (
    <Card className="overflow-hidden">
      <TableTop title="Dzienne sumy" subtitle={`${rows.length} dni z danymi`} action={<ExportButton onClick={exportCsv} />} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead>
            <tr className="border-y border-border-subtle bg-bg-elevated/40 text-[11.5px] uppercase tracking-[0.04em] text-subtle">
              <Th>Data</Th>
              <Th right>Zamówienia</Th>
              <Th right>Anulowane</Th>
              <Th right>Wartość zamówień</Th>
              <Th right>Rabaty i zwroty</Th>
              <Th right>Sprzedaż</Th>
              <Th right>Średni koszyk</Th>
              <Th right>Opłaty platform</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ date, t }) => {
              const fees = feesOf(t);
              return (
                <tr key={date} className="border-b border-border-subtle/70 transition-colors last:border-0 hover:bg-surface-hover/50">
                  <Td className="text-text">{formatWeekdayDate(date)}</Td>
                  <Td right>{formatInt(t.orders)}</Td>
                  <Td right className="text-muted">{t.cancelled || "—"}</Td>
                  <Td right>{formatPLN(t.grossBeforeDeductions)}</Td>
                  <Td right className="text-muted">{t.discounts + t.refunds > 0 ? `− ${formatPLN(t.discounts + t.refunds)}` : "—"}</Td>
                  <Td right className="font-medium text-text">{formatPLN(t.sales)}</Td>
                  <Td right>{t.orders ? formatPLN(t.sales / t.orders) : <span className="text-subtle">{NO_DATA}</span>}</Td>
                  <Td right>
                    {fees === null ? (
                      <span className="text-subtle">{NO_DATA}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {t.feesEstimated > 0 ? <Badge tone="warning" className="px-1.5 py-0 text-[10.5px]">szac.</Badge> : null}
                        {formatPLN(fees)}
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-subtle">Brak danych w wybranym zakresie.</p> : null}
      <Pagination page={Math.min(page, pageCount - 1)} pageCount={pageCount} total={rows.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </Card>
  );
}

function OrdersTable() {
  const { dataset, derived, rates } = useDemo();
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const restaurantName = useMemo(
    () => new Map(dataset?.restaurants.map((r) => [r.id, r.name.replace("Pizza Nova — ", "")]) ?? []),
    [dataset],
  );

  const rows = useMemo(() => {
    if (!dataset || !derived) return [] as NormalizedOrder[];
    const q = query.trim().toLowerCase();
    return filterOrders(dataset.orders, derived.filter)
      .filter((o) => (status === "all" ? true : o.order_status === status))
      .filter((o) => (q ? (o.external_order_id ?? "").toLowerCase().includes(q) : true))
      .sort((a, b) => (a.order_datetime < b.order_datetime ? 1 : -1));
  }, [dataset, derived, status, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const exportCsv = () => {
    const csv = toCsv(
      ["Data i godzina", "Platforma", "Lokal", "ID zamówienia", "Status", "Wartość", "Rabat", "Zwrot", "Sprzedaż", "Opłaty platform", "Rodzaj opłat"],
      rows.map((o) => {
        const fee = orderFee(o, rates);
        return [
          o.order_datetime.replace("T", " ").slice(0, 16),
          PLATFORMS[o.platform].label,
          restaurantName.get(o.restaurant_id) ?? "",
          o.external_order_id ?? "",
          o.order_status === "completed" ? "zrealizowane" : "anulowane",
          o.gross_sales.toFixed(2),
          o.discount_amount?.toFixed(2) ?? "",
          o.refund_amount?.toFixed(2) ?? "",
          o.order_status === "completed" ? netSales(o).toFixed(2) : "0.00",
          o.order_status === "completed" ? (fee.amount?.toFixed(2) ?? "") : "",
          o.order_status === "completed" ? { actual: "z pliku", estimated: "szacowane", unknown: "brak danych" }[fee.kind] : "",
        ];
      }),
    );
    downloadCsv(`restopulse-demo-zamowienia-${derived?.filter.range.from}_${derived?.filter.range.to}.csv`, csv);
    toast({ title: "Wyeksportowano CSV", description: `${rows.length.toLocaleString("pl-PL")} zamówień (dane demonstracyjne).` });
  };

  return (
    <Card className="overflow-hidden">
      <TableTop
        title="Zamówienia"
        subtitle={`${rows.length.toLocaleString("pl-PL")} zamówień`}
        action={<ExportButton onClick={exportCsv} />}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            ariaLabel="Status zamówienia"
            size="sm"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
            options={[
              { value: "all", label: "Wszystkie" },
              { value: "completed", label: "Zrealizowane" },
              { value: "cancelled", label: "Anulowane" },
            ]}
          />
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Szukaj po ID zamówienia</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Szukaj po ID…"
              className="h-8 w-full rounded-[10px] border border-border-subtle bg-bg-elevated pl-8 pr-3 text-[13px] text-text placeholder:text-subtle focus:border-accent focus:outline-none sm:w-52"
            />
          </label>
        </div>
      </TableTop>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-[13.5px]">
          <thead>
            <tr className="border-y border-border-subtle bg-bg-elevated/40 text-[11.5px] uppercase tracking-[0.04em] text-subtle">
              <Th>Data i godzina</Th>
              <Th>Platforma</Th>
              <Th>Lokal</Th>
              <Th>ID zamówienia</Th>
              <Th>Status</Th>
              <Th right>Wartość</Th>
              <Th right>Rabat / zwrot</Th>
              <Th right>Sprzedaż</Th>
              <Th right>Opłaty</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => {
              const done = o.order_status === "completed";
              const fee = done ? orderFee(o, rates) : null;
              const ded = (o.discount_amount ?? 0) + (o.refund_amount ?? 0);
              return (
                <tr key={o.id} className="border-b border-border-subtle/70 transition-colors last:border-0 hover:bg-surface-hover/50">
                  <Td className="tabular text-text">{formatDateTime(o.order_datetime)}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: PLATFORMS[o.platform].color }} />
                      {PLATFORMS[o.platform].label}
                    </span>
                  </Td>
                  <Td className="text-muted">{restaurantName.get(o.restaurant_id)}</Td>
                  <Td className="font-mono text-[12.5px] text-muted">{o.external_order_id ?? <span className="text-subtle">brak ID</span>}</Td>
                  <Td>{done ? <Badge tone="positive">Zrealizowane</Badge> : <Badge tone="negative">Anulowane</Badge>}</Td>
                  <Td right className={cn(!done && "text-subtle line-through decoration-subtle/50")}>{formatPLN(o.gross_sales)}</Td>
                  <Td right className="text-muted">{done && ded > 0 ? `− ${formatPLN(ded)}` : "—"}</Td>
                  <Td right className="font-medium text-text">{done ? formatPLN(netSales(o)) : "—"}</Td>
                  <Td right>
                    {!fee ? (
                      "—"
                    ) : fee.kind === "unknown" ? (
                      <span className="text-subtle">{NO_DATA}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        {fee.kind === "estimated" ? <Badge tone="warning" className="px-1.5 py-0 text-[10.5px]">szac.</Badge> : null}
                        {formatPLN(fee.amount)}
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="px-5 py-10 text-center text-sm text-subtle">Brak zamówień dla wybranych filtrów.</p> : null}
      <Pagination page={safePage} pageCount={pageCount} total={rows.length} pageSize={PAGE_SIZE} onPage={setPage} />
    </Card>
  );
}

function TableTop({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 pb-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th scope="col" className={cn("whitespace-nowrap px-5 py-2.5 font-medium", right ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}

function Td({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={cn("tabular whitespace-nowrap px-5 py-3 text-text/90", right && "text-right", className)}>{children}</td>;
}
