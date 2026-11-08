import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleSlash,
  FileSpreadsheet,
  Lightbulb,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const PLATFORMS = ["Glovo", "Uber Eats", "Pyszne.pl", "Wolt"];

const STEPS = [
  {
    icon: FileSpreadsheet,
    title: "Wgraj eksport",
    text: "Plik CSV prosto z panelu platformy (XLSX — wkrótce). Bez integracji i bez udostępniania haseł.",
  },
  {
    icon: ScanSearch,
    title: "Sprawdź mapowanie",
    text: "Rozpoznajemy kolumny, polskie daty i kwoty. Widzisz podgląd i błędy, zanim cokolwiek zapiszesz.",
  },
  {
    icon: Lightbulb,
    title: "Zobacz odpowiedzi",
    text: "Ile sprzedałeś, gdzie, kiedy i co się zmieniło — w jednym panelu, z porównaniem okresów.",
  },
];

const PRINCIPLES = [
  {
    icon: CircleSlash,
    title: "„Brak danych” zamiast 0 zł",
    text: "Jeśli czegoś nie ma w pliku, nie udajemy, że wynosi zero.",
  },
  {
    icon: BadgeCheck,
    title: "Szacunki są oznaczone",
    text: "Prowizje z pliku i prowizje liczone z Twoich stawek nigdy się nie mieszają bez informacji.",
  },
  {
    icon: ShieldCheck,
    title: "Kwota po opłatach to nie zysk",
    text: "Nie znamy Twoich kosztów produktów i pracy, więc nie pokazujemy fikcyjnej marży.",
  },
];

export default function LandingPage() {
  return (
    <div className="app-glow min-h-dvh overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link href="/demo" className={buttonVariants({ variant: "secondary", size: "sm" })}>
          Zobacz demo
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
          <div className="fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(167,139,250,0.25)] bg-[var(--accent-bg)] px-3 py-1 text-[12.5px] font-medium text-accent-soft">
              <TrendingUp className="size-3.5" />
              Analityka dla restauracji na platformach dostaw
            </span>
            <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] text-text sm:text-[52px]">
              Zrozum sprzedaż z platform dostaw{" "}
              <span className="bg-gradient-to-r from-[#c4b1ff] via-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">
                w 2 minuty
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-muted">
              Wgraj eksport z panelu platformy, a RestoPulse policzy sprzedaż, zamówienia, średni koszyk i opłaty —
              bez ręcznego przekopywania Excela.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Zobacz demo
                <ArrowRight />
              </Link>
              <a href="#jak-to-dziala" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Jak to działa
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[12.5px] text-subtle">Obsługiwane eksporty z:</span>
              {PLATFORMS.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-border-subtle bg-surface/60 px-3 py-1 text-[12.5px] text-muted"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <HeroPreview />
        </section>

        <section id="jak-to-dziala" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-16 sm:px-8">
          <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-text sm:text-[30px]">Jak to działa</h2>
          <p className="mt-2 max-w-xl text-muted">Trzy kroki. Bez wdrożenia, bez integracji z kasą.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-bg)] text-accent-soft">
                    <s.icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="tabular text-[13px] font-medium text-subtle">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-text">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="card overflow-hidden p-6 sm:p-10">
            <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-text sm:text-[28px]">Uczciwe liczby</h2>
            <p className="mt-2 max-w-2xl text-muted">
              Wolimy powiedzieć „nie wiemy”, niż pokazać ładny, ale błędny wynik.
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated text-positive">
                    <p.icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-text">{p.title}</h3>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <Link href="/demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Otwórz panel demo
                <ArrowRight />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-border-subtle px-5 py-8 text-[12.5px] text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} RestoPulse · wersja przedpremierowa</span>
        <span>Nazwy platform służą wyłącznie identyfikacji formatów eksportu. Brak powiązań z ich właścicielami.</span>
      </footer>
    </div>
  );
}

/** Miniatura panelu zbudowana w HTML/SVG (bez zdjęć) — wartości są ilustracyjne. */
function HeroPreview() {
  const path = "M0 70 C 30 62, 50 66, 80 52 S 130 58, 160 40 S 210 46, 240 30 S 290 34, 320 18";
  return (
    <div className="relative fade-up [animation-delay:80ms]" aria-hidden>
      <div className="absolute -inset-6 rounded-[32px] bg-[radial-gradient(closest-side,rgba(139,92,246,0.25),transparent)] blur-2xl" />
      <div className="card relative p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-muted">Panel sprzedaży</span>
          <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[11px] text-accent-soft">Ilustracja</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Przychód", "48 210 zł", "+8,4%", true],
            ["Zamówienia", "781", "+5,1%", true],
            ["Średni koszyk", "61,73 zł", "+3,1%", true],
            ["Anulacje", "3,2%", "−0,4 pp", true],
          ].map(([l, v, d]) => (
            <div key={l as string} className="rounded-xl border border-border-subtle bg-bg-elevated/60 p-3">
              <p className="text-[11.5px] text-subtle">{l}</p>
              <p className="tabular mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">{v}</p>
              <p className="mt-0.5 text-[11.5px] text-positive">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-border-subtle bg-bg-elevated/60 p-3">
          <p className="text-[11.5px] text-subtle">Sprzedaż w czasie</p>
          <svg viewBox="0 0 320 90" className="mt-2 h-24 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[22, 45, 68].map((y) => (
              <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="#1b2538" />
            ))}
            <path d={`${path} L320 90 L0 90 Z`} fill="url(#hero-fill)" />
            <path d={path} fill="none" stroke="#A78BFA" strokeWidth="2.2" />
          </svg>
        </div>
        <div className="mt-3 flex gap-2">
          {[
            ["#A78BFA", "Glovo", "34%"],
            ["#22D3EE", "Uber Eats", "27%"],
            ["#F5B454", "Pyszne.pl", "21%"],
            ["#60A5FA", "Wolt", "18%"],
          ].map(([c, n, s]) => (
            <div key={n} className={cn("flex-1 rounded-lg border border-border-subtle bg-bg-elevated/60 px-2 py-1.5")}>
              <span className="block h-1 rounded-full" style={{ background: c, width: s }} />
              <span className="mt-1 block truncate text-[10.5px] text-muted">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
