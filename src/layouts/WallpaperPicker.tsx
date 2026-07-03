import { Check, Image as ImageIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

type Theme = { c1: string; c2: string; c3: string; c4: string };

/** Four-colour palettes for the live wallpaper's drifting blobs. */
export const WALLPAPER_THEMES: Record<string, Theme | undefined> = {
  aurora: { c1: "#22d3ee", c2: "#3b82f6", c3: "#8b5cf6", c4: "#10b981" },
  ocean: { c1: "#38bdf8", c2: "#2563eb", c3: "#06b6d4", c4: "#0e7490" },
  bookends: { c1: "#3b82f6", c2: "#1b35a8", c3: "#60a5fa", c4: "#1e3a8a" },
  sunset: { c1: "#fbbf24", c2: "#f43f5e", c3: "#ec4899", c4: "#8b5cf6" },
  forest: { c1: "#34d399", c2: "#16a34a", c3: "#14b8a6", c4: "#065f46" },
  grape: { c1: "#a855f7", c2: "#d946ef", c3: "#7c3aed", c4: "#6366f1" },
  ember: { c1: "#fb923c", c2: "#ef4444", c3: "#f59e0b", c4: "#b91c1c" },
};

export const SIDEBAR_WALLPAPERS: { key: string; label: string }[] = [
  { key: "none", label: "None" },
  { key: "aurora", label: "Aurora" },
  { key: "ocean", label: "Ocean" },
  { key: "bookends", label: "Bookends" },
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

/** Header control: pick the animated sidebar wallpaper (saved per device). */
export function WallpaperPicker() {
  const current = usePrefs((s) => s.sidebarWallpaper);
  const setWallpaper = usePrefs((s) => s.setSidebarWallpaper);

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
          {SIDEBAR_WALLPAPERS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWallpaper(w.key)}
              title={w.label}
              aria-label={w.label}
              aria-pressed={current === w.key}
              className={cn(
                "relative h-12 overflow-hidden rounded-md border transition",
                current === w.key ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-90",
              )}
            >
              {w.key === "none" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
                  None
                </span>
              ) : (
                <LiveWallpaper wp={w.key} className="absolute inset-0" />
              )}
              {current === w.key && w.key !== "none" && (
                <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Live animated background, dimmed behind the menu for readability. Saved on this device.
        </p>
      </PopoverContent>
    </Popover>
  );
}
