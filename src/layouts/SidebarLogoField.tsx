import { ChefHat } from "lucide-react";
import { brandWallpaperKey, brandSolid } from "./WallpaperPicker";

// Positions/sizes/animations for the drifting logo marks. Kept subtle (low
// opacity) so nav text stays readable. Decorative only (aria-hidden).
const MARKS = [
  { top: "5%", left: "8%", size: 72, anim: "logo-float-a", dur: "14s", delay: "0s", op: 0.16 },
  { top: "28%", left: "58%", size: 46, anim: "logo-float-b", dur: "18s", delay: "1.2s", op: 0.12 },
  { top: "50%", left: "10%", size: 92, anim: "logo-float-c", dur: "16s", delay: "2.4s", op: 0.13 },
  { top: "70%", left: "52%", size: 56, anim: "logo-float-a", dur: "20s", delay: "0.6s", op: 0.14 },
  { top: "15%", left: "38%", size: 34, anim: "logo-float-b", dur: "22s", delay: "3s", op: 0.1 },
  { top: "86%", left: "20%", size: 50, anim: "logo-float-c", dur: "17s", delay: "1.8s", op: 0.12 },
];

/**
 * Animated brand-logo field: several silhouettes of the current brand's mark
 * (Capiche OK-hand / Aiko person / a chef-hat for Bookends) slowly drift, rotate
 * and pulse over the solid brand colour — the "live" wallpaper. White marks on
 * blue/red, dark marks on yellow. Reduced-motion freezes them (global CSS rule).
 */
export function SidebarLogoField({ brand }: { brand: string }) {
  const key = brandWallpaperKey(brand);
  const onDark = brandSolid(key)?.onDark ?? true;
  const src =
    key === "capiche" ? "/brands/capiche-icon.png" : key === "aiko" ? "/brands/aiko-icon.png" : null;
  // Turn any mark into a flat silhouette: white on dark brands, near-black on yellow.
  const filter = onDark ? "brightness(0) invert(1)" : "brightness(0)";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {MARKS.map((m, i) => {
        const base = {
          top: m.top,
          left: m.left,
          width: m.size,
          height: m.size,
          animation: `${m.anim} ${m.dur} ease-in-out ${m.delay} infinite`,
          opacity: m.op,
        } as const;
        return src ? (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="logo-mark object-contain"
            style={{ ...base, filter }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <ChefHat key={i} className="logo-mark" style={{ ...base, color: onDark ? "#ffffff" : "#111111" }} />
        );
      })}
    </div>
  );
}
