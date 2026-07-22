import { cn } from "@/lib/utils";

// The Kost Kraft brand mark + wordmark. The mark is the infinity logo (bowl +
// bar-chart) on its dark tile — `public/app-icon.svg` — which reads on both light
// and dark panels; the wordmark is "Kost Kraft" text alongside it.

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { box: string; title: string; sub: string }> = {
  sm: { box: "h-8 w-8 rounded-lg", title: "text-base", sub: "text-[10px]" },
  md: { box: "h-10 w-10 rounded-xl", title: "text-lg", sub: "text-[11px]" },
  lg: { box: "h-12 w-12 rounded-2xl", title: "text-2xl", sub: "text-xs" },
  xl: { box: "h-14 w-14 rounded-2xl", title: "text-3xl", sub: "text-sm" },
};

/** Just the icon tile (no wordmark). The mark sits on its own dark background, so
 *  it reads on any panel — `invert` is accepted for API compatibility. */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: Size;
  /** Accepted for API compatibility; the mark reads on any panel. */
  invert?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden shadow-sm", s.box, className)}
    >
      <img src="/app-icon.png" alt="" className="h-full w-full object-cover" />
    </span>
  );
}

/** Full logo: the mark tile + "Kost Kraft" wordmark (with an optional subtitle). */
export function Logo({
  size = "md",
  withSubtitle = false,
  subtitle = "by Bookends Hospitality",
  invert = false,
  className,
}: {
  size?: Size;
  withSubtitle?: boolean;
  subtitle?: string;
  invert?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold tracking-tight", s.title, invert ? "text-white" : "text-foreground")}>
          {/* Matches the artwork lockup: white "Kost" + teal "Kraft". The artwork's
              cyan is #01dadd, but that fails contrast on the light sidebar — #2bb6c4
              is the tuned, legible equivalent. */}
          Kost <span style={{ color: "#2bb6c4" }}>Kraft</span>
        </span>
        {withSubtitle && (
          <span className={cn("mt-1 font-medium", s.sub, invert ? "text-white/70" : "text-muted-foreground")}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
