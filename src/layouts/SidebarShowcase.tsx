import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Brand id → content key. Capiche/Aiko show their own; everything else (All /
 *  Bookends) shows Bookends. */
function brandKey(brand: string): string {
  if (brand === "capiche") return "capiche";
  if (brand === "aiko") return "aiko";
  return "bookends";
}

// Per-brand logos + quotes. Truthful brand taglines + on-brand lines — no
// fabricated stats.
const CONTENT: Record<string, { pics: string[]; quotes: string[] }> = {
  bookends: {
    pics: ["/brands/bookends.png"],
    quotes: [
      "We believe in unreasonable hospitality.",
      "One platform. Every brand. Total control.",
      "Great hospitality is built on great detail.",
      "Consistency across every outlet.",
      "Precision from prep to plate.",
    ],
  },
  capiche: {
    pics: ["/brands/capiche.png", "/brands/capiche-icon.png"],
    quotes: [
      "It's always pizza time.",
      "Naples in every bite.",
      "Dough, fire, and a little magic.",
      "Real ingredients, real Italian.",
      "Every pizza, perfectly costed.",
    ],
  },
  aiko: {
    pics: ["/brands/aiko.png", "/brands/aiko-icon.png"],
    quotes: [
      "Asian Inspired Komfort.",
      "Comfort, the Asian way.",
      "Balance in every bowl.",
      "Fresh, fragrant, and precise.",
      "Where flavour meets consistency.",
    ],
  },
};

const ROTATE_MS = 5000;

/**
 * A sidebar card showing the SELECTED brand's logo + a rotating brand quote,
 * soft-crossfading every 5s. Pauses when the tab is hidden, honours reduced-motion
 * (static), and resets when the brand changes. Purely presentational — no live
 * wallpaper, no assets beyond the existing brand logos.
 */
export function SidebarShowcase({ brand, className }: { brand: string; className?: string }) {
  const reduced = useReducedMotion();
  const key = brandKey(brand);
  const content = CONTENT[key] ?? CONTENT.bookends;
  const [i, setI] = useState(0);

  // Restart the rotation from the brand's first slide when the brand changes.
  useEffect(() => setI(0), [key]);

  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => setI((x) => x + 1), ROTATE_MS);
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
  }, [reduced, key]);

  const pic = content.pics[i % content.pics.length];
  const quote = content.quotes[i % content.quotes.length];

  return (
    <div className={cn("mx-2 mb-2 rounded-xl border border-black/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-black/40", className)}>
      <div key={`p-${i}`} className="quote-fade flex justify-center">
        <span className="inline-flex h-14 items-center justify-center rounded-lg bg-white px-3 shadow-sm ring-1 ring-black/5">
          <img
            src={pic}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="h-9 w-auto max-w-[150px] object-contain"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        </span>
      </div>
      <p key={`q-${i}`} className="quote-fade mt-3 text-center text-sm italic leading-snug text-neutral-700 dark:text-neutral-200">
        “{quote}”
      </p>
    </div>
  );
}
