import { create } from "zustand";
import type { BrandSelection } from "./BrandFilter";

// Shared dashboard brand selection so the app layout can paint the whole
// dashboard background to match the active brand.
interface BrandState {
  brand: BrandSelection;
  setBrand: (brand: BrandSelection) => void;
}

export const useDashboardBrand = create<BrandState>((set) => ({
  brand: "all",
  setBrand: (brand) => set({ brand }),
}));

/**
 * Soft full-page brand background applied to every section (low-opacity brand
 * over the base). Light enough to keep dark text + white cards readable and not
 * flashy.
 */
export function brandBgClass(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "bg-[#ed1c24]/[0.07]"; // soft Capiche red
    case "aiko":
      return "bg-[#e8b923]/[0.16]"; // soft Aiko gold
    default:
      return "bg-[#1b35a8]/[0.08]"; // soft BOOKENDS blue
  }
}

/** Brand accent colour for the dashboard wordmark / headings. */
export function brandAccentText(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "text-[#ed1c24]";
    case "aiko":
      return "text-amber-700";
    default:
      return "text-[#1b35a8]";
  }
}

export const brandWordmark: Record<BrandSelection, string> = {
  all: "BOOKENDS",
  capiche: "CAPICHE",
  aiko: "AIKO",
};
