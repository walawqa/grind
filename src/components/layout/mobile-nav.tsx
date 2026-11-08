"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";
import { DemoNotice, NavList } from "./sidebar";
import { UserMenu } from "./user-menu";

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-[rgba(8,13,25,0.82)] px-4 backdrop-blur-xl lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button
            aria-label="Otwórz menu"
            className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-text"
          >
            <Menu className="size-5" />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fade-up_200ms_ease]" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px] flex-col border-r border-border bg-[#0a0f1e] px-4 pb-5 pt-5 shadow-[var(--shadow-pop)] data-[state=open]:animate-[slide-in_240ms_var(--ease)]"
            aria-describedby={undefined}
          >
            <div className="flex items-center justify-between px-2">
              <Dialog.Title asChild>
                <span>
                  <Logo />
                </span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  aria-label="Zamknij menu"
                  className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-text"
                >
                  <X className="size-5" />
                </button>
              </Dialog.Close>
            </div>
            <div className="mt-6">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
            <div className="mt-auto">
              <DemoNotice />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Link href="/" aria-label="RestoPulse — strona startowa">
        <Logo />
      </Link>
      <UserMenu />
    </div>
  );
}
