import { useEffect, useRef, useState } from "react";
import { Check, Image as ImageIcon, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { useDashboardBrand } from "@/features/dashboard/brandTheme";
import { cn } from "@/lib/utils";

type Theme = { c1: string; c2: string; c3: string; c4: string };

/** Four-colour palettes for the live wallpaper's drifting blobs. The three brand
 *  palettes (bookends/capiche/aiko) drive the auto, brand-following wallpaper. */
export const WALLPAPER_THEMES: Record<string, Theme | undefined> = {
  // Brand looks — a monochrome of each brand's MAIN colour (shades/tints only).
  bookends: { c1: "#3b5bd9", c2: "#1b35a8", c3: "#6d8bff", c4: "#12246e" }, // Bookends — blue (#1b35a8)
  capiche: { c1: "#ff3b3b", c2: "#ed1c24", c3: "#ff7a7a", c4: "#a30f14" }, // Capiche — red (#ed1c24)
  aiko: { c1: "#ffd21a", c2: "#f5c107", c3: "#ffe066", c4: "#c99a00" }, // Aiko — yellow (#f5c107)
  // Extra looks
  aurora: { c1: "#22d3ee", c2: "#3b82f6", c3: "#8b5cf6", c4: "#10b981" },
  ocean: { c1: "#38bdf8", c2: "#2563eb", c3: "#06b6d4", c4: "#0e7490" },
  sunset: { c1: "#fbbf24", c2: "#f43f5e", c3: "#ec4899", c4: "#8b5cf6" },
  forest: { c1: "#34d399", c2: "#16a34a", c3: "#14b8a6", c4: "#065f46" },
  grape: { c1: "#a855f7", c2: "#d946ef", c3: "#7c3aed", c4: "#6366f1" },
  ember: { c1: "#fb923c", c2: "#ef4444", c3: "#f59e0b", c4: "#b91c1c" },
};

/** Map the selected brand → its wallpaper look. Unknown/dynamic brand → Bookends. */
export function brandWallpaperKey(brand: string): string {
  if (brand === "capiche") return "capiche";
  if (brand === "aiko") return "aiko";
  return "bookends"; // "all" / Bookends / anything else
}

/** Picker options. "auto" follows the selected brand; "none" is plain. */
export const SIDEBAR_WALLPAPERS: { key: string; label: string }[] = [
  { key: "auto", label: "Auto (brand)" },
  { key: "none", label: "None" },
  { key: "bookends", label: "Bookends" },
  { key: "capiche", label: "Capiche" },
  { key: "aiko", label: "Aiko" },
  { key: "aurora", label: "Aurora" },
  { key: "ocean", label: "Ocean" },
  { key: "sunset", label: "Sunset" },
  { key: "forest", label: "Forest" },
  { key: "grape", label: "Grape" },
  { key: "ember", label: "Ember" },
];

/** A live, flowing background: four blurred colour blobs drifting and morphing on
 *  independent loops — reads like a slow video. Fills its positioned parent. */
export function LiveWallpaper({ wp, className }: { wp: string; className?: string }) {
  const t = WALLPAPER_THEMES[wp];
  if (!t) return null;
  return (
    <div aria-hidden className={cn("live-wp", className)}>
      <span className="lw-blob lw-b1" style={{ background: t.c1 }} />
      <span className="lw-blob lw-b2" style={{ background: t.c2 }} />
      <span className="lw-blob lw-b3" style={{ background: t.c3 }} />
      <span className="lw-blob lw-b4" style={{ background: t.c4 }} />
    </div>
  );
}

/**
 * Sidebar wallpaper with a smooth crossfade. When `wp` changes (e.g. the brand
 * switches) the new look is stacked on top and fades in over the old, which is
 * removed after the transition — no flash, and no restart on route changes
 * (this lives in the persistent app shell). Stable keys keep the surviving layer
 * from remounting / re-fading.
 */
export function BrandSidebarWallpaper({ wp, className }: { wp: string; className?: string }) {
  const [layers, setLayers] = useState<{ id: number; wp: string }[]>(() => [{ id: 0, wp }]);
  const nextId = useRef(1);

  useEffect(() => {
    setLayers((cur) => (cur[cur.length - 1].wp === wp ? cur : [...cur, { id: nextId.current++, wp }]));
  }, [wp]);

  // After the crossfade, keep only the newest layer.
  useEffect(() => {
    if (layers.length <= 1) return;
    const t = setTimeout(() => setLayers((cur) => cur.slice(-1)), 550);
    return () => clearTimeout(t);
  }, [layers]);

  return (
    <div aria-hidden className={cn("absolute inset-0", className)}>
      {layers.map((l) => (
        <div key={l.id} className="wp-fade-in absolute inset-0">
          <LiveWallpaper wp={l.wp} className="absolute inset-0" />
        </div>
      ))}
    </div>
  );
}

/** Header control: pick the sidebar wallpaper — Auto (follows brand), off, or a
 *  fixed look. Saved per device. */
export function WallpaperPicker() {
  const current = usePrefs((s) => s.sidebarWallpaper);
  const setWallpaper = usePrefs((s) => s.setSidebarWallpaper);
  const brand = useDashboardBrand((s) => s.brand);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Sidebar wallpaper" aria-label="Sidebar wallpaper">
          <ImageIcon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="mb-2 text-sm font-medium">Sidebar wallpaper</p>
        <div className="grid grid-cols-4 gap-2">
          {SIDEBAR_WALLPAPERS.map((w) => {
            const active = current === w.key;
            // "auto" previews the current brand's look.
            const previewWp = w.key === "auto" ? brandWallpaperKey(brand) : w.key;
            return (
              <button
                key={w.key}
                type="button"
                onClick={() => setWallpaper(w.key)}
                title={w.label}
                aria-label={w.label}
                aria-pressed={active}
                className={cn(
                  "relative h-12 overflow-hidden rounded-md border transition",
                  active ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-90",
                )}
              >
                {w.key === "none" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
                    None
                  </span>
                ) : (
                  <LiveWallpaper wp={previewWp} className="absolute inset-0" />
                )}
                {w.key === "auto" && (
                  <span className="absolute bottom-0.5 left-0.5 inline-flex items-center gap-0.5 rounded bg-black/45 px-1 py-px text-[8px] font-semibold uppercase tracking-wide text-white">
                    <Sparkles className="h-2.5 w-2.5" /> Auto
                  </span>
                )}
                {active && w.key !== "none" && (
                  <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Auto</span> follows the selected brand
          (Bookends · Capiche · Aiko). Dimmed behind the menu for readability. Saved on this device.
        </p>
      </PopoverContent>
    </Popover>
  );
}
