import { FileUp, Layers, LayoutDashboard, Lightbulb, ReceiptText, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/demo", label: "Przegląd", icon: LayoutDashboard },
  { href: "/demo/sprzedaz", label: "Sprzedaż", icon: ReceiptText },
  { href: "/demo/platformy", label: "Platformy", icon: Layers },
  { href: "/demo/import", label: "Import danych", icon: FileUp },
  { href: "/demo/insighty", label: "Raporty i insighty", icon: Lightbulb },
  { href: "/demo/ustawienia", label: "Ustawienia", icon: Settings },
];
