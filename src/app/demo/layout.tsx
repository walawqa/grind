import type { Metadata } from "next";
import { MobileTopBar } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { DemoDataProvider } from "@/components/providers/demo-data";

export const metadata: Metadata = {
  title: "Demo",
  robots: { index: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoDataProvider>
      <div className="app-glow min-h-dvh overflow-x-clip">
        <Sidebar />
        <div className="lg:pl-[var(--sidebar-w)]">
          <MobileTopBar />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pt-8">{children}</main>
        </div>
      </div>
    </DemoDataProvider>
  );
}
