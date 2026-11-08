import type { PlatformId } from "./types";

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  /** Kolor serii na wykresach — stonowany, spójny z paletą. */
  color: string;
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  glovo: { id: "glovo", label: "Glovo", color: "#A78BFA" },
  ubereats: { id: "ubereats", label: "Uber Eats", color: "#22D3EE" },
  pyszne: { id: "pyszne", label: "Pyszne.pl", color: "#F5B454" },
  wolt: { id: "wolt", label: "Wolt", color: "#60A5FA" },
  other: { id: "other", label: "Inne", color: "#94A3B8" },
};

/** Platformy obsługiwane w imporcie i filtrach (kolejność wyświetlania). */
export const PLATFORM_ORDER: PlatformId[] = ["glovo", "ubereats", "pyszne", "wolt", "other"];

export function platformLabel(id: PlatformId): string {
  return PLATFORMS[id]?.label ?? id;
}
