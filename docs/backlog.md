# Backlog

## Etap 2 — konta i baza (proponowany następny)
- Supabase: projekt, migracje SQL (tabele z `docs/architektura.md`), RLS na każdej tabeli z danymi
- Rejestracja / logowanie e-mail + hasło, reset hasła, wylogowanie; middleware chroniący `/app/*`
- Onboarding lokalu (nazwa, PLN, Europe/Warsaw), dodawanie kolejnego lokalu
- Stawki prowizji zapisywane w bazie; edycja danych lokalu
- Przycisk „Rozpocznij” na landingu (dziś celowo ukryty, bo rejestracja nie istnieje)
- Testy izolacji: dwa konta, próba odczytu/zapisu cudzego `restaurant_id` przez API → 403/0 wierszy
- Tryb demo pozostaje pod `/demo` — bez dostępu do bazy

## Etap 3 — importer
- Zapis importu (Server Action), fingerprint SHA-256, deduplikacja (opis w architekturze)
- XLSX (biblioteka do weryfikacji pod kątem bezpieczeństwa i licencji, np. `exceljs`), wybór arkusza
- Zapisywane wzorce mapowania per platforma
- Raporty zbiorcze → `aggregate_reports`, osobne KPI bez liczby zamówień, gdy jej brak
- Historia importów z usuwaniem (potwierdzenie) i pobieraniem błędnych wierszy jako CSV
- Rate limit uploadu, limit 10 MB po stronie serwera, logi bez treści plików

## Etap 4 — insighty i eksport
- Dalsze reguły (np. godziny szczytu, udział rabatów), porównanie lokali
- Opcjonalny „Raport AI” (serwer, limit kosztów, tylko zagregowane KPI)

## Etap 5 — testy z klientami
- Polityka prywatności / regulamin (do przygotowania z prawnikiem), retencja danych, usuwanie konta
- Checklista deploymentu (Vercel + Supabase), krótki film demo

## Pomysły / później
- Light mode, eksport PDF, e-mail tygodniowy (za zgodą), billing (miejsce wydzielone, bez implementacji)
