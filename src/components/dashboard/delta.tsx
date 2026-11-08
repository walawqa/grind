import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDelta } from "@/lib/format";

/** Znacznik zmiany. `invert` — dla miar, gdzie spadek jest dobry (np. anulacje). */
export function DeltaBadge({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null || !Number.isFinite(value)) {
    return <Badge tone="neutral">—</Badge>;
  }
  const flat = Math.abs(value) < 0.0005;
  const good = invert ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge tone={flat ? "neutral" : good ? "positive" : "negative"} className="tabular">
      <Icon strokeWidth={2.4} />
      {formatDelta(value)}
    </Badge>
  );
}
