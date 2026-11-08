import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import type { InsightResult } from "@/lib/insights";
import { InsightItem } from "./insight-item";

export function InsightsCard({ result }: { result: InsightResult }) {
  const items = result.insights.slice(0, 3);
  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Najważniejsze obserwacje"
        subtitle="Wyliczone regułowo z Twoich danych"
        action={
          <Badge tone="accent">
            <Sparkles />
            Reguły
          </Badge>
        }
      />
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-4">
        {items.length ? (
          items.map((i) => <InsightItem key={i.id} insight={i} />)
        ) : (
          <p className="text-sm text-subtle">
            Za mało kompletnych danych, by wskazać rzetelne obserwacje. Wybierz dłuższy zakres dat.
          </p>
        )}
      </div>
      <div className="border-t border-border-subtle px-5 py-3">
        <Link
          href="/demo/insighty"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-soft transition-colors hover:text-text"
        >
          Wszystkie obserwacje ({result.insights.length})
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
