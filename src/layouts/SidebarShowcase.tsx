import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Every brand picture in /public/brands. Shown on a white chip so the mixed
// backgrounds/aspect ratios sit consistently. Decorative only (aria-hidden).
const PICTURES = [
  "/brands/bookends.png",
  "/brands/capiche.png",
  "/brands/aiko.png",
  "/brands/capiche-icon.png",
  "/brands/aiko-icon.png",
];

// Truthful brand taglines + shared kitchen/costing lines. No fabricated stats.
const QUOTES = [
  "We believe in unreasonable hospitality.",
  "It's always pizza time.",
  "Asian Inspired Komfort.",
  "Consistency is the secret ingredient.",
  "Cost every gram — waste nothing.",
  "Great food starts with great numbers.",
  "Standardize once, serve perfectly always.",
  "Precision in the kitchen, profit on the plate.",
];

const ROTATE_MS = 5000;

/**
 * A live overlay band for the sidebar: rotates through all brand pictures and
 * quotes with a soft crossfade, sitting over the brand-coloured live wallpaper.
 * Pauses when the tab is hidden and honours reduced-motion (shows a static slide).
 */
export function SidebarShowcase({ className }: { className?: string }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduced) return; // static slide when reduced motion is on
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => setI((x) => x + 1), ROTATE_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  const pic = PICTURES[i % PICTURES.length];
  const quote = QUOTES[i % QUOTES.length];

  return (
    <div className={cn("mx-3 mb-2 rounded-lg border border-white/40 bg-background/40 p-3 backdrop-blur-sm dark:border-white/10", className)}>
      <div key={`p-${i}`} className="quote-fade flex justify-center">
        <span className="inline-flex h-10 items-center justify-center rounded-md bg-white px-2 shadow-sm ring-1 ring-black/5">
          <img
            src={pic}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="h-7 w-auto max-w-[130px] object-contain"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        </span>
      </div>
      <p key={`q-${i}`} className="quote-fade mt-2 text-center text-xs italic leading-snug text-foreground/80">
        “{quote}”
      </p>
    </div>
  );
}
