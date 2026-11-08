"use client";

import { FileCheck2, FileWarning } from "lucide-react";
import { useMemo } from "react";
import { CoverageNotice } from "@/components/dashboard/coverage-notice";
import { DeltaBadge } from "@/components/dashboard/delta";
import { PlatformTable } from "@/components/dashboard/platform-table";
import { PlatformTrendChart } from "@/components/dashboard/platform-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInt, formatPercent, formatPLN, formatRange, NO_DATA } from "@/lib/format";
import { dailyByPlatform, findRate } from "@/lib/kpi";
import { PLATFORMS } from "@/lib/platforms";

export default function PlatformsPage() {
  const { derived, dataset, rates } = useDemo();

  const trend = useMemo(
    () => (dataset && derived ? dailyByPlatform(dataset.orders, derived.filter, dataset.coverage) : []),
    [dataset, derived],
  );

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader title="Platformy" subtitle="Porównanie agregatorów i źródeł danych" />
      <CoverageNotice />
      {!derived || !dataset ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-4 h-8 w-32" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {derived.platforms.map((r) => (
              <Card key={r.platform} className="relative overflow-hidden p-5">
                <span className="absolute inset-x-0 top-0 h-[2px]" style={{ background: PLATFORMS[r.platform].color }} />
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[14px] font-semibold text-text">
                    <span className="size-2.5 rounded-full" style={{ background: PLATFORMS[r.platform].color }} />
                    {PLATFORMS[r.platform].label}
                  </span>
                  <span className="tabular text-[12.5px] text-muted">{formatPercent(r.share)} udziału</span>
                </div>
                <p className="tabular mt-3 text-[24px] font-semibold tracking-[-0.03em] text-text">
                  {formatPLN(r.sales, { compact: true })}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[12px] text-subtle">
                  {r.delta === null ? "Brak porównania" : (
                    <>
                      <DeltaBadge value={r.delta} /> vs poprzedni okres
                    </>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3 text-[12px]">
                  <div>
                    <dt className="text-subtle">Zamówienia</dt>
                    <dd className="tabular mt-0.5 font-medium text-text">{formatInt(r.orders)}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Koszyk</dt>
                    <dd className="tabular mt-0.5 font-medium text-text">{formatPLN(r.aov)}</dd>
                  </div>
                  <div>
                    <dt className="text-subtle">Opłaty</dt>
                    <dd className="tabular mt-0.5 font-medium text-text">
                      {r.feeRate === null ? <span className="text-subtle">—</span> : formatPercent(r.feeRate, 0)}
                      {r.feeKind !== "actual" && r.feeRate !== null ? <span className="ml-1 text-warning">*</span> : null}
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </section>

          <PlatformTrendChart data={trend} platforms={derived.platforms.map((r) => r.platform)} />

          <PlatformTable rows={derived.platforms} />

          <Card>
            <CardHeader title="Źródła danych" subtitle="Co zawierają zaimportowane pliki dla każdej platformy" />
            <ul className="mt-3 divide-y divide-border-subtle">
              {derived.platforms.map((r) => {
                const sampleRestaurant = dataset.restaurants[0].id;
                const rate = findRate(rates, sampleRestaurant, r.platform, dataset.coverage.to);
                const actual = r.feeKind === "actual";
                return (
                  <li key={r.platform} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex size-9 items-center justify-center rounded-xl"
                        style={{ background: `${PLATFORMS[r.platform].color}1a`, color: PLATFORMS[r.platform].color }}
                      >
                        {actual ? <FileCheck2 className="size-4" /> : <FileWarning className="size-4" />}
                      </span>
                      <div>
                        <p className="text-[14px] font-medium text-text">{PLATFORMS[r.platform].label}</p>
                        <p className="text-[12.5px] text-muted">
                          Pojedyncze zamówienia · {formatRange(dataset.coverage.from, dataset.coverage.to)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge tone="positive">ID zamówień</Badge>
                      <Badge tone="positive">Statusy</Badge>
                      {actual ? (
                        <Badge tone="positive">Prowizje z pliku</Badge>
                      ) : (
                        <Badge tone="warning">
                          Prowizje szacowane{rate ? ` (${formatPercent(rate.rate, 0)})` : ` — ${NO_DATA}`}
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border-subtle px-5 py-3 text-[12px] text-subtle">
              * Opłaty szacowane według stawek z Ustawień, bo plik platformy nie zawierał prowizji.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
