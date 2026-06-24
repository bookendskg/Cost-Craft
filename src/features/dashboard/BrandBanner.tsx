import { cn } from "@/lib/utils";
import type { BrandSelection } from "./BrandFilter";

// Per-brand banner shown on the dashboard. "All Brands" shows the parent
// BOOKENDS identity; each brand gets its own colour + wordmark.
const BANNERS: Record<BrandSelection, { label: string; className: string; tagline: string }> = {
  all: {
    label: "BOOKENDS",
    className: "bg-[#1b35a8] text-white",
    tagline: "All Brands",
  },
  capiche: {
    label: "CAPICHE",
    className: "bg-emerald-800 text-white",
    tagline: "Italian Kitchen",
  },
  aiko: {
    label: "AIKO",
    className: "bg-slate-900 text-white",
    tagline: "Asian Kitchen",
  },
};

export function BrandBanner({ brand }: { brand: BrandSelection }) {
  const b = BANNERS[brand];
  return (
    <div
      className={cn(
        "mb-6 flex h-28 items-center justify-center rounded-xl shadow-sm transition-colors",
        b.className,
      )}
    >
      <div className="text-center">
        <p className="text-3xl font-extrabold tracking-[0.18em] sm:text-4xl">{b.label}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.3em] opacity-70">{b.tagline}</p>
      </div>
    </div>
  );
}
