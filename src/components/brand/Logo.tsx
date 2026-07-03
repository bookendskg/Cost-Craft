import { useState } from "react";
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

// The CostCraft brand mark + wordmark.
//
// To use a real logo image: drop a file at ONE of these paths (SVG preferred):
//     public/brands/costcraft.svg
//     public/brands/costcraft.png
// The <Logo> below will show it automatically; until then it falls back to the
// designed mark (ChefHat glyph in a Bookends-blue tile) + "CostCraft" wordmark, so
// nothing breaks. On dark/inverted panels the designed mark is used (a colour logo
// image wouldn't read on dark) — optionally add `costcraft-white.svg`/`.png` and
// it will be used there.

type Size = "sm" | "md" | "lg" | "xl";

const SIZES: Record<Size, { box: string; icon: string; title: string; sub: string; img: string }> = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", title: "text-base", sub: "text-[10px]", img: "h-7" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", title: "text-lg", sub: "text-[11px]", img: "h-9" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-6 w-6", title: "text-2xl", sub: "text-xs", img: "h-11" },
  xl: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7", title: "text-3xl", sub: "text-sm", img: "h-14" },
};

const LOGO_CANDIDATES = ["/brands/costcraft.svg", "/brands/costcraft.png"];
const LOGO_CANDIDATES_WHITE = ["/brands/costcraft-white.svg", "/brands/costcraft-white.png"];

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

/** Full logo: the official CostCraft logo image if present, else the designed
 *  mark + "CostCraft" wordmark (with an optional Bookends subtitle). */
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
  const candidates = invert ? LOGO_CANDIDATES_WHITE : LOGO_CANDIDATES;
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  // Show the official logo image when one loads; fall back to the designed mark.
  if (!failed) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        <img
          src={candidates[idx]}
          alt="CostCraft"
          className={cn(s.img, "w-auto object-contain")}
          onError={() => (idx + 1 < candidates.length ? setIdx(idx + 1) : setFailed(true))}
        />
      </span>
    );
  }

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
