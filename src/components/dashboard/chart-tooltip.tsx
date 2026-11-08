import { cn } from "@/lib/cn";

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
  dashed?: boolean;
  muted?: boolean;
}

export function ChartTooltipBox({
  title,
  rows,
  footnote,
  className,
}: {
  title: string;
  rows: TooltipRow[];
  footnote?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-[190px] rounded-xl border border-border bg-[#0d1426]/95 px-3 py-2.5 shadow-[var(--shadow-pop)] backdrop-blur-md",
        className,
      )}
    >
      <p className="text-[12px] font-medium text-muted">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 text-[12.5px]">
            <span className="flex items-center gap-2 text-muted">
              {r.color ? (
                <span
                  className={cn("inline-block h-[3px] w-3 rounded-full", r.dashed && "opacity-70")}
                  style={{
                    background: r.dashed
                      ? `repeating-linear-gradient(90deg, ${r.color} 0 3px, transparent 3px 5px)`
                      : r.color,
                  }}
                />
              ) : null}
              {r.label}
            </span>
            <span className={cn("tabular font-semibold", r.muted ? "text-muted" : "text-text")}>{r.value}</span>
          </div>
        ))}
      </div>
      {footnote ? <p className="mt-2 border-t border-border-subtle pt-1.5 text-[11px] text-subtle">{footnote}</p> : null}
    </div>
  );
}
