import { expect, test } from "@playwright/test";
import path from "node:path";

test("landing → demo: KPI, filtry i nawigacja działają", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Zrozum sprzedaż");
  await page.getByRole("link", { name: "Zobacz demo" }).first().click();

  await expect(page.getByRole("heading", { name: "Panel sprzedaży" })).toBeVisible();
  const revenue = page.getByText("Przychód ze sprzedaży").locator("xpath=ancestor::div[contains(@class,'card')]");
  await expect(revenue).toContainText("zł");
  const before = await revenue.innerText();

  // zmiana zakresu dat zmienia wartości
  await page.getByRole("radio", { name: "7 dni" }).click();
  await expect.poll(async () => revenue.innerText()).not.toBe(before);

  // 90 dni: brak danych za poprzedni okres → brak porównania, nie fałszywa zmiana
  await page.getByRole("radio", { name: "90 dni" }).click();
  await expect(page.getByText("Brak pełnych danych za poprzedni okres").first()).toBeVisible();

  // nawigacja
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Otwórz menu" }).click();
  await page.getByRole("link", { name: "Sprzedaż" }).click();
  await expect(page.getByRole("heading", { name: "Sprzedaż", exact: true })).toBeVisible();

  // brak poziomego przewijania
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("usunięcie stawki prowizji daje „Brak danych”, a nie 0 zł", async ({ page }) => {
  await page.goto("/demo/ustawienia");
  await page.getByRole("button", { name: "Usuń stawkę Pyszne.pl" }).click();
  await page.getByRole("button", { name: "Usuń", exact: true }).click();
  await page.getByRole("tab", { name: "Widzew" }).click();
  await page.getByRole("button", { name: "Usuń stawkę Pyszne.pl" }).click();
  await page.getByRole("button", { name: "Usuń", exact: true }).click();
  const nav = page.getByRole("navigation", { name: "Nawigacja główna" }).first();
  if (!(await nav.isVisible())) await page.getByRole("button", { name: "Otwórz menu" }).click();
  await page.getByRole("link", { name: "Przegląd" }).first().click();
  const card = page.getByText("Szacunkowa kwota po opłatach platform").locator("xpath=ancestor::div[contains(@class,'card')]");
  await expect(card).toContainText("Brak danych");
  await expect(card).toContainText("Uzupełnij stawki prowizji: Pyszne.pl");
});

test("podgląd importu waliduje błędne wiersze", async ({ page }) => {
  await page.goto("/demo/import");
  await page.getByLabel("Wybierz plik CSV").setInputFiles(path.join(process.cwd(), "public/samples/TESTOWE-bledne-wiersze.csv"));
  await expect(page.getByText("Wynik walidacji")).toBeVisible();
  const stat = (label: string) => page.getByText(label, { exact: true }).locator("xpath=../..");
  await expect(stat("Poprawne wiersze")).toContainText("4");
  await expect(stat("Pominięte duplikaty")).toContainText("1");
  await expect(stat("Wiersze z błędami")).toContainText("6");
});

test("raport zbiorczy nie jest liczony jako zamówienia", async ({ page }) => {
  await page.goto("/demo/import");
  await page.getByLabel("Wybierz plik CSV").setInputFiles(path.join(process.cwd(), "public/samples/TESTOWE-raport-dzienny-wolt.csv"));
  await expect(page.getByText("To wygląda na raport zbiorczy")).toBeVisible();
  await expect(page.getByText("Wynik walidacji")).toHaveCount(0);
});
