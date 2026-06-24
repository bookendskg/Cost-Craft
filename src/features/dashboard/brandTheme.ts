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

/** Full-page background class for the selected brand. */
export function brandBgClass(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "bg-emerald-800";
    case "aiko":
      return "bg-slate-900";
    default:
      return "bg-[#1b35a8]"; // BOOKENDS blue (All Brands)
  }
}

export const brandWordmark: Record<BrandSelection, string> = {
  all: "BOOKENDS",
  capiche: "CAPICHE",
  aiko: "AIKO",
};
