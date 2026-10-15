import { cn } from "@/lib/utils";
import { useBrands } from "@/features/brands/hooks";
import { deriveBrandAccent } from "@/lib/data/brandCache";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** A brand id, or the special "all" selection. */
export type BrandSelection = string;

// The built-in brands have hand-tuned active chip colours; a dynamically-added
// brand's chip is painted from its own accent colour (inline) instead.
const KNOWN_ACTIVE: Record<string, string> = {
  all: "bg-[#1b35a8] text-white shadow",
  capiche: "bg-[#ed1c24] text-white shadow",
  aiko: "bg-[#e8b923] text-slate-900 shadow",
};

/** Same hues as KNOWN_ACTIVE, as hex — for the dropdown's colour dots. */
const KNOWN_HEX: Record<string, string> = {
  all: "#1b35a8",
  capiche: "#ed1c24",
  aiko: "#e8b923",
};

type BrandOption = { id: string; name: string; accent: string | null };

/** "Bookends" (all brands) followed by every active brand. Brands load dynamically. */
function useBrandOptions(): BrandOption[] {
  const { data: brands = [] } = useBrands();
  return [
    { id: "all", name: "Bookends", accent: null },
    ...brands
      .filter((b) => b.status === "active")
      .map((b) => ({ id: b.id, name: b.name, accent: b.accent_color })),
  ];
}

function brandHex(o: BrandOption): string {
  return KNOWN_HEX[o.id] ?? (o.accent || deriveBrandAccent(o.id));
}

/** Segmented All / <brands…> switcher — the desktop header control. */
export function BrandFilter({
  value,
  onChange,
  className,
}: {
  value: BrandSelection;
  onChange: (value: BrandSelection) => void;
  className?: string;
}) {
  const options = useBrandOptions();
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted p-1", className)}>
      {options.map((o) => {
        const active = value === o.id;
        const known = KNOWN_ACTIVE[o.id];
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? known ?? "text-white shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
            style={active && !known ? { backgroundColor: brandHex(o), color: "#fff" } : undefined}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

/** Dropdown brand picker with colour dots — the mobile drawer control. Stays one
 *  row however many brands there are (the segmented control overflows a drawer). */
export function BrandSelect({
  value,
  onChange,
  className,
}: {
  value: BrandSelection;
  onChange: (value: BrandSelection) => void;
  className?: string;
}) {
  const options = useBrandOptions();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-10 font-medium", className)} aria-label="Brand">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id} className="py-2">
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: brandHex(o) }}
              />
              {o.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
