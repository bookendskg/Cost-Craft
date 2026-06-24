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

/** Full bold brand background applied across the whole screen (light mode). */
export function brandBgClass(brand: BrandSelection): string {
  switch (brand) {
    case "capiche":
      return "bg-[#ed1c24]"; // Capiche red
    case "aiko":
      return "bg-[#e8b923]"; // Aiko gold
    default:
      return "bg-[#1b35a8]"; // BOOKENDS blue
  }
}

/** Aiko's gold is light → dark text; the others use white. */
export function brandIsLight(brand: BrandSelection): boolean {
  return brand === "aiko";
}

/** Readable text colour for content sitting directly on the brand background. */
export function brandFgClass(brand: BrandSelection): string {
  return brandIsLight(brand) ? "text-slate-900" : "text-white";
}

export const brandWordmark: Record<BrandSelection, string> = {
  all: "BOOKENDS",
  capiche: "CAPICHE",
  aiko: "AIKO",
};
