"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function UserMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Profil"
          className="inline-flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2a3550] to-[#1a2238] text-[12px] font-semibold text-text ring-1 ring-border transition hover:ring-border-strong"
        >
          GD
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <div className="px-2.5 py-2">
          <p className="text-sm font-medium text-text">Gość demo</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Przeglądasz dane syntetyczne. Konta i logowanie pojawią się w Etapie 2.
          </p>
        </div>
        <div className="my-1 h-px bg-border-subtle" />
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <LogOut className="size-4" />
          Wyjdź z trybu demo
        </Link>
      </PopoverContent>
    </Popover>
  );
}
