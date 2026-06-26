import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BrandSelection } from "./BrandFilter";

// Shared brand selection. Drives the app-wide accent theme (CSS color variables)
// AND the soft page tint, so every section matches the active brand — like the
// dashboard. Persisted so the chosen brand theme sticks across reloads.
interface BrandState {
  brand: BrandSelection;
  setBrand: (brand: BrandSelection) => void;
}

export const useDashboardBrand = create<BrandState>()(
  persist(
    (set) => ({
      brand: "all",
      setBrand: (brand) => set({ brand }),
    }),
    { name: "rcms.brand" },
  ),
);

/**
 * Apply the brand accent theme app-wide by setting a `brand-*` class on <html>.
 * The class overrides --primary/--accent/--ring (see index.css), so buttons,
 * active nav, focus rings, links, and dark-mode headings all pick up the brand
 * colour — the dashboard theme, everywhere.
 */
export function applyBrand(brand: BrandSelection) {
  const el = document.documentElement;
  el.classList.remove("brand-all", "brand-capiche", "brand-aiko");
  el.classList.add(`brand-${brand}`);
}

/** Soft brand-tinted page background (light mode). */
export function brandBgClass(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "bg-[#fef2f2]"; // soft Capiche red
    case "aiko":
      return "bg-[#fffbeb]"; // soft Aiko gold
    default:
      return "bg-[#eff6ff]"; // soft BOOKENDS blue
  }
}

/** Brand accent text colour (logos, headings, links). */
export function brandAccentText(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "text-[#ed1c24]";
    case "aiko":
      return "text-amber-600";
    default:
      return "text-[#1b35a8]";
  }
}

export const brandWordmark: Record<BrandSelection, string> = {
  all: "BOOKENDS",
  capiche: "CAPICHE",
  aiko: "AIKO",
};
