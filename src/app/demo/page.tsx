"use client";

import { Coins, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
import { CoverageNotice } from "@/components/dashboard/coverage-notice";
import { InsightsCard } from "@/components/dashboard/insights-card";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { PlatformDonut } from "@/components/dashboard/platform-donut";
import { PlatformTable } from "@/components/dashboard/platform-table";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { WeekdayChart } from "@/components/dashboard/weekday-chart";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInt, formatPercent, formatPLN } from "@/lib/format";
import { KPI_DEFINITIONS } from "@/lib/kpi";
import { platformLabel } from "@/lib/platforms";

export default function OverviewPage() {
  const { derived } = useDemo();

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader title="Panel sprzedaży" subtitle="Sprzedaż ze wszystkich platform dostaw w jednym miejscu" />
      <CoverageNotice />
      {!derived ? <OverviewSkeleton /> : <OverviewContent />}
    </div>
  );
}

function OverviewContent() {
  const { derived } = useDemo();
  if (!derived) return null;
  const { kpis, daily, weekday, platforms, insights, filter } = derived;
  const af = kpis.afterFees;

  return (
    <>
      <section aria-label="Kluczowe wskaźniki" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Przychód ze sprzedaży"
          icon={Wallet}
          value={kpis.sales.value}
          formatted={formatPLN(kpis.sales.value, { compact: true })}
          delta={kpis.sales.delta}
          note={kpis.sales.note}
          definition={KPI_DEFINITIONS.sales}
          spark={daily.map((d) => d.sales)}
          color="#A78BFA"
          footer={
            kpis.sales.value !== null ? (
              <>
                Wartość zamówień {formatPLN(kpis.current.grossBeforeDeductions, { compact: true })}, rabaty i zwroty{" "}
                {formatPLN(kpis.current.discounts + kpis.current.refunds, { compact: true })}.
              </>
            ) : null
          }
        />
        <KpiCard
          label="Liczba zamówień"
          icon={ShoppingBag}
          value={kpis.orders.value}
          formatted={formatInt(kpis.orders.value)}
          delta={kpis.orders.delta}
          note={kpis.orders.note}
          definition={KPI_DEFINITIONS.orders}
          spark={daily.map((d) => d.orders)}
          color="#22D3EE"
          footer={
            kpis.cancellationRate.value !== null ? (
              <>
                Anulowane: {formatInt(kpis.current.cancelled)} ({formatPercent(kpis.cancellationRate.value)}) — niewliczone.
              </>
            ) : null
          }
        />
        <KpiCard
          label="Średnia wartość zamówienia"
          icon={ReceiptText}
          value={kpis.aov.value}
          formatted={formatPLN(kpis.aov.value)}
          delta={kpis.aov.delta}
          note={kpis.aov.note}
          definition={KPI_DEFINITIONS.aov}
          spark={daily.map((d) => d.aov)}
          color="#60A5FA"
          footer={
            kpis.aov.value !== null ? (
              <>Sprzedaż ÷ liczba zrealizowanych zamówień w wybranym okresie.</>
            ) : null
          }
        />
        <KpiCard
          label="Szacunkowa kwota po opłatach platform"
          icon={Coins}
          value={af.value}
          formatted={formatPLN(af.value, { compact: true })}
          delta={af.delta}
          note={af.note}
          definition={KPI_DEFINITIONS.afterFees}
          spark={daily.map((d) => d.afterFees)}
          color="#34D399"
          footer={
            af.value === null ? (
              af.unknownPlatforms.length ? (
                <>Uzupełnij stawki prowizji: {af.unknownPlatforms.map(platformLabel).join(", ")}.</>
              ) : null
            ) : af.estimatedShare > 0 ? (
              <>
                Opłaty {formatPLN(af.feesTotal, { compact: true })}, w tym{" "}
                <span className="text-warning">{formatPercent(af.estimatedShare, 0)} szacowane</span> (
                {af.estimatedPlatforms.map(platformLabel).join(", ")}). To nie jest zysk.
              </>
            ) : (
              <>Opłaty {formatPLN(af.feesTotal, { compact: true })} — wartości z plików. To nie jest zysk.</>
            )
          }
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <SalesChart data={daily} range={filter.range} comparison={kpis.comparison.available} />
        </div>
        <div className="min-w-0">
          <PlatformDonut rows={platforms} total={kpis.sales.value} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <WeekdayChart data={weekday} />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <InsightsCard result={insights} />
        </div>
      </section>

      <PlatformTable rows={platforms} />
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ładowanie danych" className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-[260px] w-full" />
        </Card>
        <Card className="p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mx-auto mt-6 size-[190px] rounded-full" />
        </Card>
      </div>
    </div>
  );
}
