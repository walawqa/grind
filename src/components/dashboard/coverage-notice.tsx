"use client";

import { AlertCircle } from "lucide-react";
import { useDemo } from "@/components/providers/demo-data";
import { formatRange } from "@/lib/format";

/** Komunikat o niepełnym pokryciu zakresu danymi. */
export function CoverageNotice() {
  const { derived, dataset } = useDemo();
  if (!derived || !dataset || derived.kpis.coverage === "full") return null;
  const none = derived.kpis.coverage === "none";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[rgba(245,180,84,0.25)] bg-[var(--warning-bg)] px-4 py-3 text-[13px] text-text">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
      <p>
        {none ? "W wybranym zakresie nie ma danych. " : "Wybrany zakres jest tylko częściowo pokryty danymi. "}
        Dane obejmują okres {formatRange(dataset.coverage.from, dataset.coverage.to)}.
        {!none ? " Porównania z poprzednim okresem są wyłączone." : ""}
      </p>
    </div>
  );
}
