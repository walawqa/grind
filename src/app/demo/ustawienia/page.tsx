"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { MapPin, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useDemo } from "@/components/providers/demo-data";
import { useToast } from "@/components/providers/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFullDate } from "@/lib/format";
import { PLATFORMS, PLATFORM_ORDER } from "@/lib/platforms";
import type { CommissionRate, PlatformId } from "@/lib/types";

export default function SettingsPage() {
  const { dataset } = useDemo();
  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <PageHeader title="Ustawienia" subtitle="Lokale i stawki prowizji używane do szacowania opłat" filters={false} importButton={false} />
      {!dataset ? (
        <Card className="p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-5 h-40 w-full" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <RatesCard />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <Card>
              <CardHeader title="Lokale" subtitle="Organizacja demonstracyjna" />
              <ul className="flex flex-col gap-2 p-5">
                {dataset.restaurants.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border-subtle bg-bg-elevated/50 p-3.5">
                    <p className="text-[14px] font-medium text-text">{r.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {r.city}
                      </span>
                      <span>Waluta: {r.currency}</span>
                      <span>Strefa: {r.timezone}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border-subtle px-5 py-3 text-[12px] text-subtle">
                Dodawanie lokali i edycja ich danych pojawią się razem z kontami (Etap 2).
              </p>
            </Card>
            <Card className="p-5">
              <h2 className="text-[15px] font-semibold text-text">Twoje dane</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                W trybie demo nic nie jest zapisywane — zmiany stawek obowiązują do odświeżenia strony. Eksport i usuwanie
                danych konta zostaną dodane wraz z bazą danych.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function RatesCard() {
  const { dataset, rates, setRates, resetRates } = useDemo();
  const toast = useToast();
  const [restaurantId, setRestaurantId] = useState(dataset!.restaurants[0].id);
  const [draft, setDraft] = useState<{ platform: PlatformId; rate: string; valid_from: string }>({
    platform: "pyszne",
    rate: "",
    valid_from: dataset!.coverage.from,
  });
  const [toDelete, setToDelete] = useState<CommissionRate | null>(null);

  const list = rates
    .filter((r) => r.restaurant_id === restaurantId)
    .sort((a, b) => PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform) || a.valid_from.localeCompare(b.valid_from));

  const parsedRate = Number(draft.rate.replace(",", "."));
  const rateValid = draft.rate.trim() !== "" && Number.isFinite(parsedRate) && parsedRate >= 0 && parsedRate <= 60;
  const duplicate = list.some((r) => r.platform === draft.platform && r.valid_from === draft.valid_from);

  return (
    <Card>
      <CardHeader
        title="Stawki prowizji"
        subtitle="Używane tylko wtedy, gdy plik platformy nie zawiera prowizji. Wynik jest oznaczany jako szacunek."
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              resetRates();
              toast({ title: "Przywrócono domyślne stawki demo" });
            }}
          >
            <RotateCcw />
            <span className="hidden sm:inline">Przywróć</span>
          </Button>
        }
      />
      <div className="px-5 pt-4">
        <div role="tablist" aria-label="Lokal" className="flex flex-wrap gap-1.5">
          {dataset!.restaurants.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={restaurantId === r.id}
              onClick={() => setRestaurantId(r.id)}
              className={
                restaurantId === r.id
                  ? "rounded-[10px] bg-surface-3 px-3 py-1.5 text-[13px] font-medium text-text"
                  : "rounded-[10px] px-3 py-1.5 text-[13px] text-subtle hover:text-muted"
              }
            >
              {r.name.replace("Pizza Nova — ", "")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead>
            <tr className="border-y border-border-subtle bg-bg-elevated/40 text-[11.5px] uppercase tracking-[0.04em] text-subtle">
              <th className="px-5 py-2.5 text-left font-medium">Platforma</th>
              <th className="px-5 py-2.5 text-right font-medium">Stawka</th>
              <th className="px-5 py-2.5 text-left font-medium">Obowiązuje od</th>
              <th className="px-5 py-2.5 text-left font-medium">Źródło prowizji w plikach</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className="border-b border-border-subtle/70 last:border-0">
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-text">
                    <span className="size-2 rounded-full" style={{ background: PLATFORMS[r.platform].color }} />
                    {PLATFORMS[r.platform].label}
                  </span>
                </td>
                <td className="tabular px-5 py-3 text-right font-medium text-text">
                  {(r.rate * 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%
                </td>
                <td className="px-5 py-3 text-muted">{formatFullDate(r.valid_from)}</td>
                <td className="px-5 py-3">
                  {r.platform === "pyszne" ? (
                    <Badge tone="warning">Brak — stawka używana</Badge>
                  ) : (
                    <Badge tone="neutral">W pliku — stawka zapasowa</Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Button size="icon" variant="ghost" className="size-8" aria-label={`Usuń stawkę ${PLATFORMS[r.platform].label}`} onClick={() => setToDelete(r)}>
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-subtle">
                  Brak stawek. Opłaty dla plików bez prowizji będą pokazywane jako „Brak danych”.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <form
        className="grid grid-cols-1 items-end gap-3 border-t border-border-subtle p-5 sm:grid-cols-[1fr_120px_160px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!rateValid || duplicate) return;
          setRates([
            ...rates,
            {
              id: `rate_${Date.now()}`,
              restaurant_id: restaurantId,
              platform: draft.platform,
              rate: parsedRate / 100,
              valid_from: draft.valid_from,
            },
          ]);
          setDraft((d) => ({ ...d, rate: "" }));
          toast({ title: "Dodano stawkę", description: "Wskaźniki przeliczono z nową stawką." });
        }}
      >
        <label className="flex flex-col gap-1.5 text-[12.5px] text-muted">
          Platforma
          <select
            value={draft.platform}
            onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value as PlatformId }))}
            className="h-9 rounded-[10px] border border-border bg-bg-elevated px-2.5 text-[13px] text-text focus:border-accent focus:outline-none"
          >
            {PLATFORM_ORDER.filter((p) => p !== "other").map((p) => (
              <option key={p} value={p}>
                {PLATFORMS[p].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] text-muted">
          Stawka (%)
          <input
            inputMode="decimal"
            placeholder="np. 15"
            value={draft.rate}
            onChange={(e) => setDraft((d) => ({ ...d, rate: e.target.value }))}
            className="h-9 rounded-[10px] border border-border bg-bg-elevated px-2.5 text-[13px] text-text placeholder:text-subtle focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[12.5px] text-muted">
          Obowiązuje od
          <input
            type="date"
            value={draft.valid_from}
            onChange={(e) => setDraft((d) => ({ ...d, valid_from: e.target.value }))}
            className="h-9 rounded-[10px] border border-border bg-bg-elevated px-2.5 text-[13px] text-text [color-scheme:dark] focus:border-accent focus:outline-none"
          />
        </label>
        <Button type="submit" variant="primary" disabled={!rateValid || duplicate || !draft.valid_from}>
          <Plus />
          Dodaj stawkę
        </Button>
        {draft.rate && !rateValid ? <p className="text-[12px] text-negative sm:col-span-4">Podaj stawkę od 0 do 60%.</p> : null}
        {duplicate ? <p className="text-[12px] text-negative sm:col-span-4">Stawka dla tej platformy i daty już istnieje.</p> : null}
      </form>

      <Dialog.Root open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-[#0f1729] p-6 shadow-[var(--shadow-pop)]">
            <Dialog.Title className="text-[16px] font-semibold text-text">Usunąć stawkę?</Dialog.Title>
            <Dialog.Description className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {toDelete ? `${PLATFORMS[toDelete.platform].label}: ${(toDelete.rate * 100).toLocaleString("pl-PL")}% od ${formatFullDate(toDelete.valid_from)}. ` : ""}
              Jeśli dla tej platformy nie ma prowizji w plikach, kwota po opłatach pokaże „Brak danych”.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button variant="ghost">Anuluj</Button>
              </Dialog.Close>
              <Button
                className="border-[rgba(251,113,133,0.4)] bg-[var(--negative-bg)] text-negative hover:bg-[rgba(251,113,133,0.2)]"
                onClick={() => {
                  if (toDelete) setRates(rates.filter((r) => r.id !== toDelete.id));
                  setToDelete(null);
                  toast({ title: "Usunięto stawkę" });
                }}
              >
                Usuń
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Card>
  );
}
