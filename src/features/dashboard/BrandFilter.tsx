import { cn } from "@/lib/utils";
import { BRANDS, type Brand } from "@/lib/data/types";

export type BrandSelection = Brand | "all";

const OPTIONS: { value: BrandSelection; label: string }[] = [
  { value: "all", label: "All Brands" },
  ...BRANDS,
];

// Active chip is painted in that brand's own colour.
const ACTIVE: Record<BrandSelection, string> = {
  all: "bg-[#1b35a8] text-white shadow",
  capiche: "bg-[#ed1c24] text-white shadow",
  aiko: "bg-[#e8b923] text-slate-900 shadow",
};

/** Segmented All / Capiche / Aiko brand switcher. `className="w-full"` makes it
 *  a full-width, equal-segment control for mobile drawers. */
export function BrandFilter({
  value,
  onChange,
  className,
}: {
  value: BrandSelection;
  onChange: (value: BrandSelection) => void;
  className?: string;
}) {
  const fullWidth = className?.includes("w-full");
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted p-1", fullWidth && "flex w-full", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            fullWidth && "flex-1",
            value === o.value ? ACTIVE[o.value] : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
