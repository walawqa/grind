# Jak zaimportować eksport w nieznanym formacie

RestoPulse nie zakłada żadnego „oficjalnego” układu kolumn. Każdy plik CSV można zmapować ręcznie.

## 1. Przygotuj plik
- Zapisz arkusz jako **CSV UTF-8** (Excel: *Plik → Zapisz jako → CSV UTF-8*).
- Pierwszy wiersz musi zawierać nagłówki. Usuń wiersze tytułowe i podsumowania („Razem”, „Suma”) nad i pod tabelą.
- Separator `;` lub `,` jest wykrywany automatycznie.

## 2. Wymagane i opcjonalne pola

| Pole | Wymagane | Przykłady nagłówków | Przykłady wartości |
|---|---|---|---|
| Data i godzina zamówienia | tak | Data, Order Date, Created at | `03.11.2026 18:45`, `2026-11-03 18:45`, `2026-11-03T17:45:00Z` |
| Kwota sprzedaży | tak | Kwota, Wartość zamówienia, Subtotal, Total | `54,90`, `1 249,00 zł`, `54.90` |
| ID zamówienia | zalecane | Numer zamówienia, Order ID | dowolny tekst |
| Status | nie (domyślnie: zrealizowane) | Status, Order Status | zrealizowane, dostarczone, delivered, anulowane, cancelled |
| Waluta | nie (domyślnie PLN) | Waluta, Currency | PLN, zł |
| Prowizja | nie | Prowizja, Commission, Marketplace Fee | `15,37` (wartość ujemna jest traktowana jako potrącenie) |
| Inne opłaty | nie | Inne opłaty, Other fees | |
| Rabat | nie | Rabat, Promotion, Discount | |
| Zwrot | nie | Zwrot, Refund | |

## 3. Co wybrać jako „Kwotę sprzedaży”
Wybierz wartość zamówienia zapłaconą przez klienta **przed** prowizją platformy. Jeśli plik zawiera tylko kwotę „do wypłaty”
(po prowizji), nie mapuj jej jako sprzedaży — wyniki byłyby zaniżone. W razie wątpliwości porównaj sumę z panelem platformy.

## 4. Raporty zbiorcze
Jeśli wiersz pliku to dzień/tydzień (jest kolumna „Liczba zamówień”), RestoPulse rozpozna raport zbiorczy i **nie policzy wierszy jako zamówień**.
Import takich raportów do osobnego modelu danych pojawi się w Etapie 3.

## 5. Brak prowizji w pliku
Uzupełnij stawki w *Ustawienia → Stawki prowizji*. Opłaty zostaną oszacowane jako `stawka × (kwota − rabat)` i oznaczone „szac.”.
Bez stawek panel pokaże „Brak danych” zamiast 0 zł.

## Pliki testowe
W `public/samples/` (i do pobrania na ekranie *Import danych*) — wszystkie z prefiksem `TESTOWE-`, dane w 100% syntetyczne.
Wygenerujesz je ponownie poleceniem `npm run samples`.
