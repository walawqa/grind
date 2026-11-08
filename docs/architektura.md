# Architektura i plan (Etap 0)

## Stack

| Warstwa | Wybór | Uwagi |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | jeden projekt na frontend i API (Route Handlers / Server Actions) |
| Styl | Tailwind CSS v4 + tokeny CSS w `globals.css` | komponenty w stylu shadcn/ui (Radix + cva), pisane w repo |
| Prymitywy UI | Radix (Dialog, Popover, Tooltip) | dostępność: fokus, klawiatura, ARIA |
| Wykresy | Recharts 3 | własne tooltipy, gradienty, legendy |
| Ikony | lucide-react | |
| Walidacja | Zod | schemat wiersza importu (`src/lib/import/mapping.ts`) |
| Baza / Auth (Etap 2) | Supabase: PostgreSQL + Auth + Storage, RLS | darmowy plan na czas testów |
| Testy | Vitest (logika), Playwright (ścieżki użytkownika) | |
| Deploy (później) | Vercel + Supabase | dopiero po Twojej decyzji |

## Moduły

```
src/lib/            czysta logika (bez Reacta) — łatwa do testów i do przeniesienia na serwer
  types.ts          model domenowy (pola = kolumny w bazie)
  kpi.ts            definicje i obliczenia KPI, serie wykresów, porównanie okresów
  insights.ts       regułowy silnik obserwacji (z progami kompletności)
  import/           parser CSV, mapowanie kolumn, polskie liczby/daty, walidacja
  demo/generate.ts  deterministyczny generator danych syntetycznych
  csv.ts            eksport z ochroną przed formula injection
src/components/     UI: layout (sidebar, filtry), dashboard (KPI, wykresy, tabele), ui (prymitywy)
src/app/            trasy: / (landing), /demo/* (panel na danych demo)
```

W Etapie 2 `DemoDataProvider` zostanie zastąpiony providerem pobierającym dane z Supabase — komponenty i `src/lib` się nie zmieniają.

## Model danych (docelowe tabele, Etap 2)

```
organizations        id, name, created_at
memberships          organization_id, user_id, role                (RLS: użytkownik widzi tylko swoje organizacje)
restaurants          id, organization_id, name, city, currency='PLN', timezone='Europe/Warsaw'
commission_rates     id, restaurant_id, platform, rate, valid_from
imports              id, organization_id, restaurant_id, platform, file_name, file_sha256,
                     kind ('orders' | 'aggregate'), period_start, period_end, status,
                     rows_total, rows_accepted, rows_duplicate, rows_error, mapping_id, created_by, created_at
import_errors        import_id, source_row, messages[]              (do pobrania jako CSV)
column_mappings      id, organization_id, platform, name, mapping jsonb
orders               organization_id, restaurant_id, platform, external_order_id NULL, order_datetime,
                     order_date, order_status, currency, gross_sales, discount_amount NULL,
                     refund_amount NULL, commission_amount NULL, other_platform_fees NULL,
                     dedupe_key, import_id, source_row, created_at
                     UNIQUE (restaurant_id, platform, dedupe_key)
aggregate_reports    organization_id, restaurant_id, platform, period_start, period_end,
                     orders_count NULL, gross_sales, commission_amount NULL, import_id, source_row
```

Każda tabela z danymi ma `organization_id`; polityki RLS sprawdzają członkostwo (`memberships`). Usunięcie importu kasuje kaskadowo jego wiersze.

## Deduplikacja (Etap 3)

1. **Ten sam plik:** `file_sha256` — ponowne wgranie identycznego pliku jest blokowane z komunikatem.
2. **Zamówienia z ID:** `dedupe_key = external_order_id`; `UNIQUE (restaurant_id, platform, dedupe_key)` + `ON CONFLICT DO NOTHING` → nakładające się eksporty nie dublują sprzedaży.
3. **Zamówienia bez ID:** `dedupe_key = hash(order_datetime, gross_sales, status, numer wystąpienia w obrębie tej samej minuty i kwoty)`. Dwa realne, identyczne zamówienia w tej samej minucie zostaną zachowane (różny numer wystąpienia), ale ponowny import tego samego okresu ich nie podwoi. Użytkownik dostaje ostrzeżenie, że dla plików bez ID deduplikacja jest heurystyczna.
4. **Raporty zbiorcze:** klucz `(restaurant_id, platform, period_start, period_end)` — nowszy import zastępuje starszy po potwierdzeniu.

## Definicje KPI

Zob. `KPI_DEFINITIONS` w `src/lib/kpi.ts` (te same teksty są pokazywane w aplikacji).
Zasady: brak danych → `null` → „Brak danych” (nie 0 zł); prowizje z pliku i szacowane są liczone osobno i oznaczane;
porównanie okresów tylko przy pełnym pokryciu obu okresów; „kwota po opłatach” nigdy nie jest nazywana zyskiem.

## Ryzyka importu

- Brak publicznej specyfikacji eksportów platform; formaty mogą się zmieniać → mapowanie konfigurowalne + zapisywane wzorce.
- Eksporty z kwotami ujemnymi dla potrąceń, różne znaczenie „kwoty” (z prowizją/bez, z dostawą/bez) → wymagane świadome mapowanie i opis pola w kreatorze.
- Strefy czasowe (UTC vs czas lokalny) i zmiana czasu → normalizacja do Europe/Warsaw przy imporcie.
- Pliki XLSX z wieloma arkuszami, scalonymi komórkami, wierszami podsumowań → wybór arkusza i wykrywanie wiersza nagłówka (Etap 3).
- Dane osobowe klientów w eksportach (adresy, telefony) → importujemy wyłącznie zmapowane kolumny KPI; reszta pliku nie jest zapisywana.
- Raporty zbiorcze mylone z listą zamówień → wykrywanie (`looksLikeAggregate`) i osobny model.
