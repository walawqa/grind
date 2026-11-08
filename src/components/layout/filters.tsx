"use client";

import { CalendarDays, Check, ChevronDown, Layers, Store } from "lucide-react";
import { useState } from "react";
import { MenuItem, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/providers/demo-data";
import { cn } from "@/lib/cn";
import { formatDayMonth, formatRange } from "@/lib/format";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { PlatformId, RangePreset } from "@/lib/types";

const triggerCls =
  "inline-flex h-9 min-w-0 items-center gap-2 rounded-[11px] border border-border-subtle bg-surface-2/80 px-3 text-[13px] font-medium text-text transition-colors duration-[var(--dur)] hover:border-border hover:bg-surface-hover data-[state=open]:border-border-strong [&_svg]:shrink-0";

export function RestaurantPicker() {
  const { dataset, restaurantId, setRestaurantId } = useDemo();
  if (!dataset) return <div className="skeleton h-9 w-44" />;
  const current = dataset.restaurants.find((r) => r.id === restaurantId);
  return (
    <Popover>
      <PopoverTrigger className={triggerCls} aria-label="Wybierz lokal">
        <Store className="size-4 text-subtle" />
        <span className="truncate">{current ? current.name : "Wszystkie lokale"}</span>
        <ChevronDown className="size-3.5 text-subtle" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64" role="menu">
        <PopoverClose asChild>
          <MenuItem active={restaurantId === "all"} onClick={() => setRestaurantId("all")}>
            <span className="flex-1">Wszystkie lokale</span>
            <span className="text-[12px] text-subtle">{dataset.restaurants.length}</span>
          </MenuItem>
        </PopoverClose>
        <div className="my-1 h-px bg-border-subtle" />
        {dataset.restaurants.map((r) => (
          <PopoverClose asChild key={r.id}>
            <MenuItem active={restaurantId === r.id} onClick={() => setRestaurantId(r.id)}>
              <span className="flex-1 truncate">{r.name}</span>
              {restaurantId === r.id ? <Check className="size-4 text-accent-soft" /> : null}
            </MenuItem>
          </PopoverClose>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function PlatformPicker() {
  const { platforms, setPlatforms } = useDemo();
  const available = PLATFORM_ORDER.filter((p) => p !== "other");
  const toggle = (p: PlatformId) =>
    setPlatforms(platforms.includes(p) ? platforms.filter((x) => x !== p) : [...platforms, p]);
  const label =
    platforms.length === 0 || platforms.length === available.length
      ? "Wszystkie platformy"
      : platforms.length === 1
        ? PLATFORMS[platforms[0]].label
        : `${platforms.length} platformy`;
  return (
    <Popover>
      <PopoverTrigger className={triggerCls} aria-label="Filtr platform">
        <Layers className="size-4 text-subtle" />
        <span className="truncate">{label}</span>
        {platforms.length > 0 && platforms.length < available.length ? (
          <span className="flex -space-x-1">
            {platforms.map((p) => (
              <span key={p} className="size-2 rounded-full ring-2 ring-surface-2" style={{ background: PLATFORMS[p].color }} />
            ))}
          </span>
        ) : null}
        <ChevronDown className="size-3.5 text-subtle" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60">
        <MenuItem active={platforms.length === 0} onClick={() => setPlatforms([])}>
          <span className="flex-1">Wszystkie platformy</span>
          {platforms.length === 0 ? <Check className="size-4 text-accent-soft" /> : null}
        </MenuItem>
        <div className="my-1 h-px bg-border-subtle" />
        {available.map((p) => {
          const on = platforms.includes(p);
          return (
            <MenuItem key={p} active={on} onClick={() => toggle(p)} role="menuitemcheckbox">
              <span className="size-2.5 rounded-full" style={{ background: PLATFORMS[p].color }} />
              <span className="flex-1">{PLATFORMS[p].label}</span>
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-[5px] border transition-colors",
                  on ? "border-accent bg-accent" : "border-border-strong",
                )}
              >
                {on ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
              </span>
            </MenuItem>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

const PRESETS: { value: Exclude<RangePreset, "custom">; label: string }[] = [
  { value: "7d", label: "7 dni" },
  { value: "30d", label: "30 dni" },
  { value: "90d", label: "90 dni" },
];

export function DateRangePicker() {
  const { range, preset, setPreset, setCustomRange, dataset } = useDemo();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string; to: string } | null>(null);
  if (!range || !dataset) return <div className="skeleton h-9 w-64" />;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Zakres dat"
        className="inline-flex h-9 shrink-0 items-center rounded-[11px] border border-border-subtle bg-bg-elevated p-0.5"
      >
        {PRESETS.map((p) => (
          <button
            key={p.value}
            role="radio"
            aria-checked={preset === p.value}
            onClick={() => setPreset(p.value)}
            className={cn(
              "h-full rounded-[9px] px-2.5 text-[12.5px] font-medium transition-all duration-[var(--dur)]",
              preset === p.value
                ? "bg-surface-3 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "text-subtle hover:text-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setDraft(range);
        }}
      >
        <PopoverTrigger
          className={cn(triggerCls, preset === "custom" && "border-[rgba(167,139,250,0.4)]")}
          aria-label="Własny zakres dat"
        >
          <CalendarDays className="size-4 text-subtle" />
          <span className="truncate tabular">
            {preset === "custom" ? formatRange(range.from, range.to) : `${formatDayMonth(range.from)} – ${formatDayMonth(range.to)}`}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4">
          <p className="text-sm font-medium text-text">Własny zakres</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Dane demo: {formatRange(dataset.coverage.from, dataset.coverage.to)}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-[12px] text-muted">
                {k === "from" ? "Od" : "Do"}
                <input
                  type="date"
                  value={draft?.[k] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...(d ?? range), [k]: e.target.value }))}
                  className="h-9 rounded-[10px] border border-border bg-bg-elevated px-2 text-[13px] text-text [color-scheme:dark] focus:border-accent focus:outline-none"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Anuluj
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!draft?.from || !draft?.to}
              onClick={() => {
                if (draft?.from && draft?.to) setCustomRange(draft);
                setOpen(false);
              }}
            >
              Zastosuj
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
