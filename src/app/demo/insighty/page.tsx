"use client";

import { Bot, CircleDashed, Sparkles } from "lucide-react";
import { CoverageNotice } from "@/components/dashboard/coverage-notice";
import { InsightItem } from "@/components/dashboard/insight-item";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRange } from "@/lib/format";
import { KPI_DEFINITIONS } from "@/lib/kpi";

const DEFINITIONS: { label: string; text: string }[] = [
  { label: "Sprzedaż", text: KPI_DEFINITIONS.sales },
  { label: "Liczba zamówień", text: KPI_DEFINITIONS.orders },
  { label: "Średnia wartość zamówienia", text: KPI_DEFINITIONS.aov },
  { label: "Szacunkowa kwota po opłatach platform", text: KPI_DEFINITIONS.afterFees },
  { label: "Zmiana okres do okresu", text: KPI_DEFINITIONS.comparison },
  { label: "Odsetek anulacji", text: KPI_DEFINITIONS.cancellationRate },
];

export default function InsightsPage() {
  const { derived } = useDemo();
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader title="Raporty i insighty" subtitle="Obserwacje wyliczone z danych według jawnych reguł" />
      <CoverageNotice />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
          <Card>
            <CardHeader
              title="Obserwacje"
              subtitle={derived ? `Okres: ${formatRange(derived.filter.range.from, derived.filter.range.to)}` : "Ładowanie…"}
              action={
                <Badge tone="accent">
                  <Sparkles />
                  Silnik regułowy
                </Badge>
              }
            />
            <div className="flex flex-col divide-y divide-border-subtle px-5 pb-2 pt-3">
              {!derived ? (
                <div className="flex flex-col gap-4 py-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : derived.insights.insights.length ? (
                derived.insights.insights.map((i) => (
                  <div key={i.id} className="py-4">
                    <InsightItem insight={i} showBasis />
                  </div>
                ))
              ) : (
                <p className="py-6 text-sm text-subtle">Za mało kompletnych danych w wybranym zakresie.</p>
              )}
            </div>
          </Card>

          {derived && derived.insights.skipped.length ? (
            <Card>
              <CardHeader
                title="Reguły pominięte"
                subtitle="Nie pokazujemy obserwacji, gdy dane są niepełne lub zbyt nieliczne"
              />
              <ul className="flex flex-col gap-3 p-5">
                {derived.insights.skipped.map((s) => (
                  <li key={s.id} className="flex gap-3 text-[13px]">
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <span>
                      <span className="font-medium text-text">{s.name}:</span> <span className="text-muted">{s.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card className="relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-accent opacity-15 blur-2xl" />
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-accent-soft">
                <Bot className="size-[18px]" />
              </span>
              <h2 className="text-[15px] font-semibold text-text">Raport AI</h2>
              <Badge tone="neutral" className="ml-auto">
                Planowany
              </Badge>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Opcjonalny tygodniowy raport (3 obserwacje, 2 ryzyka, 3 działania) generowany po stronie serwera wyłącznie
              z zagregowanych KPI. Wymaga klucza API i limitu kosztów — zostanie dodany po ustabilizowaniu importu. Panel
              działa w pełni bez niego.
            </p>
          </Card>

          <Card>
            <CardHeader title="Definicje wskaźników" subtitle="Jak liczymy każdą wartość" />
            <dl className="flex flex-col gap-4 p-5">
              {DEFINITIONS.map((d) => (
                <div key={d.label}>
                  <dt className="text-[13px] font-medium text-text">{d.label}</dt>
                  <dd className="mt-1 text-[12.5px] leading-relaxed text-muted">{d.text}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
