import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RestoPulse — analityka sprzedaży z platform dostaw", template: "%s · RestoPulse" },
  description:
    "Zrozum sprzedaż z Glovo, Uber Eats, Pyszne.pl i Wolt w 2 minuty — bez ręcznego przekopywania Excela.",
};

export const viewport: Viewport = {
  themeColor: "#080D19",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
