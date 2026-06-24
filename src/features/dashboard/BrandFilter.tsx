import { cn } from "@/lib/utils";
import { BRANDS, type Brand } from "@/lib/data/types";

export type BrandSelection = Brand | "all";

const OPTIONS: { value: BrandSelection; label: string }[] = [
  { value: "all", label: "All Brands" },
  ...BRANDS,
];

/** Segmented All / Capiche / Aiko toggle used on the dashboards. */
export function BrandFilter({
  value,
  onChange,
}: {
  value: BrandSelection;
  onChange: (value: BrandSelection) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-background text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
