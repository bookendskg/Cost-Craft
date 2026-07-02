import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

// The CostCraft brand mark + wordmark. There is no bitmap logo asset in the repo;
// the mark is the ChefHat glyph in a rounded Bookends-blue tile, matching the
// in-app header. Reused by the login page, public landing header/footer, etc.

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { box: string; icon: string; title: string; sub: string }> = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", title: "text-base", sub: "text-[10px]" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", title: "text-lg", sub: "text-[11px]" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-6 w-6", title: "text-2xl", sub: "text-xs" },
  xl: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7", title: "text-3xl", sub: "text-sm" },
};

/** Just the icon tile (no wordmark). `invert` = for dark/coloured panels. */
export function BrandMark({
  size = "md",
  invert = false,
  className,
}: {
  size?: Size;
  invert?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center shadow-sm",
        invert
          ? "bg-white/15 text-white ring-1 ring-inset ring-white/25"
          : "bg-primary text-primary-foreground",
        s.box,
        className,
      )}
    >
      <ChefHat className={s.icon} />
    </span>
  );
}

/** Full logo: mark + "CostCraft" wordmark, with an optional Bookends subtitle. */
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
      <BrandMark size={size} invert={invert} />
      <span className="flex flex-col leading-none">
        <span className={cn("font-semibold tracking-tight", s.title, invert ? "text-white" : "text-foreground")}>
          Cost<span className={invert ? "text-white" : "text-primary"}>Craft</span>
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
