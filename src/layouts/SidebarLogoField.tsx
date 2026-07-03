import { brandWallpaperKey, brandSolid } from "./WallpaperPicker";

// Positions/sizes/animations for the drifting logo marks. Kept subtle (low
// opacity) so nav text stays readable. Decorative only (aria-hidden).
const MARKS = [
  { top: "5%", left: "8%", size: 78, anim: "logo-float-a", dur: "14s", delay: "0s", op: 0.18 },
  { top: "28%", left: "56%", size: 52, anim: "logo-float-b", dur: "18s", delay: "1.2s", op: 0.14 },
  { top: "50%", left: "8%", size: 96, anim: "logo-float-c", dur: "16s", delay: "2.4s", op: 0.15 },
  { top: "70%", left: "50%", size: 60, anim: "logo-float-a", dur: "20s", delay: "0.6s", op: 0.15 },
  { top: "15%", left: "36%", size: 40, anim: "logo-float-b", dur: "22s", delay: "3s", op: 0.12 },
  { top: "86%", left: "18%", size: 54, anim: "logo-float-c", dur: "17s", delay: "1.8s", op: 0.13 },
];

/**
 * Animated brand-logo field: several copies of the current brand's own logo
 * slowly drift, rotate and pulse over the solid brand colour — the "live"
 * wallpaper. Bookends uses its full logo; Capiche/Aiko use their transparent
 * icon marks rendered as silhouettes (white on red, dark on yellow) so they read
 * cleanly. Kept low-opacity for readability; reduced-motion freezes them.
 */
export function SidebarLogoField({ brand }: { brand: string }) {
  const key = brandWallpaperKey(brand);
  const onDark = brandSolid(key)?.onDark ?? true;
  // Capiche/Aiko have transparent icon marks → tint to a flat silhouette.
  // Bookends only ships a full logo lockup → show it as-is.
  const silhouette = key === "capiche" || key === "aiko";
  const src =
    key === "capiche"
      ? "/brands/capiche-icon.png"
      : key === "aiko"
        ? "/brands/aiko-icon.png"
        : "/brands/bookends.png";
  const filter = onDark ? "brightness(0) invert(1)" : "brightness(0)";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {MARKS.map((m, i) => (
        <img
          key={i}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="logo-mark object-contain"
          style={{
            top: m.top,
            left: m.left,
            width: m.size,
            height: m.size,
            animation: `${m.anim} ${m.dur} ease-in-out ${m.delay} infinite`,
            opacity: m.op,
            filter: silhouette ? filter : undefined,
          }}
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ))}
    </div>
  );
}
