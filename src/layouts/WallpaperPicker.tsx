import { Check, Image as ImageIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

/** Animated ("live") sidebar wallpapers. `className` is applied as the moving
 *  gradient layer; "none" renders the plain sidebar. Shared by the layout + picker. */
export const SIDEBAR_WALLPAPERS: { key: string; label: string; className: string }[] = [
  { key: "none", label: "None", className: "" },
  { key: "aurora", label: "Aurora", className: "wp wp-aurora" },
  { key: "ocean", label: "Ocean", className: "wp wp-ocean" },
  { key: "bookends", label: "Bookends", className: "wp wp-bookends" },
  { key: "sunset", label: "Sunset", className: "wp wp-sunset" },
  { key: "forest", label: "Forest", className: "wp wp-forest" },
  { key: "grape", label: "Grape", className: "wp wp-grape" },
  { key: "ember", label: "Ember", className: "wp wp-ember" },
];

export function wallpaperClass(key: string): string {
  return SIDEBAR_WALLPAPERS.find((w) => w.key === key)?.className ?? "";
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
              {w.className ? (
                <span className={cn("absolute inset-0", w.className)} />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-muted text-[10px] text-muted-foreground">
                  None
                </span>
              )}
              {current === w.key && w.className && (
                <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Live gradient, dimmed behind the menu for readability. Saved on this device.
        </p>
      </PopoverContent>
    </Popover>
  );
}
