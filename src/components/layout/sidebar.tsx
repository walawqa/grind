"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav";

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Nawigacja główna" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/demo" ? pathname === "/demo" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors duration-[var(--dur)]",
              active
                ? "bg-[linear-gradient(90deg,rgba(139,92,246,0.16),rgba(139,92,246,0.04))] text-text"
                : "text-muted hover:bg-surface-hover/70 hover:text-text",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-soft transition-opacity duration-[var(--dur)]",
                active ? "opacity-100 shadow-[0_0_12px_rgba(167,139,250,0.8)]" : "opacity-0",
              )}
            />
            <Icon
              className={cn(
                "size-[18px] transition-colors",
                active ? "text-accent-soft" : "text-subtle group-hover:text-muted",
              )}
              strokeWidth={1.8}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DemoNotice() {
  return (
    <div className="rounded-2xl border border-[rgba(167,139,250,0.18)] bg-[linear-gradient(160deg,rgba(139,92,246,0.14),rgba(139,92,246,0.03))] p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-text">
        <FlaskConical className="size-4 text-accent-soft" />
        Dane demonstracyjne
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
        Fikcyjna sieć „Pizza Nova”. Wszystkie liczby są syntetyczne i służą wyłącznie prezentacji.
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-border-subtle bg-[rgba(9,14,27,0.72)] px-4 pb-5 pt-6 backdrop-blur-xl lg:flex">
      <Link href="/" className="px-2" aria-label="RestoPulse — strona startowa">
        <Logo />
      </Link>
      <div className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle">Menu</div>
      <div className="mt-2">
        <NavList />
      </div>
      <div className="mt-auto">
        <DemoNotice />
      </div>
    </aside>
  );
}
