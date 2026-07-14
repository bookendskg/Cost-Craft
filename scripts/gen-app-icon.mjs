// Generate the PWA icon set + brand assets from the official CostCraft artwork in
// assets/. Two icon families on the brand background (#010c12):
//   • "any" icons (pwa-64/192/512) = the FULL logo — used by the TWA native splash
//     and browser/desktop, so the splash matches the in-app full-logo splash.
//   • "maskable" + apple-touch = the MARK, centered with padding so the adaptive
//     launcher mask never trims it (it fills the bubble without being cut).
// Also copies the full logo + mark into public/brand/ (splash + in-app BrandMark).
//
// Run: node scripts/gen-app-icon.mjs
import sharp from "sharp";
import fs from "node:fs";

const SRC_MARK = "assets/costcraftt.png"; // infinity mark
const SRC_FULL = "assets/costcraft db.png"; // full logo + wordmark
const BG = "#010c12"; // sampled from the artwork

fs.mkdirSync("public/brand", { recursive: true });
fs.copyFileSync(SRC_FULL, "public/brand/costcraft-logo.png");
fs.copyFileSync(SRC_MARK, "public/brand/costcraft-mark.png");

/** The full logo centered (contain) on a square brand-bg canvas at `size`. */
async function fullSquare(size, widthPct = 0.92) {
  const logo = await sharp(SRC_FULL)
    .trim()
    .resize({ width: Math.round(size * widthPct), fit: "inside" })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

/** The mark centered on a square brand-bg canvas, sized to `widthPct` of the box. */
async function markSquare(size, widthPct) {
  const mark = await sharp(SRC_MARK)
    .trim()
    .resize({ width: Math.round(size * widthPct), fit: "inside" })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

// "any" icons — the full logo (drives the native splash).
for (const s of [64, 192, 512]) {
  fs.writeFileSync(`public/pwa-${s}x${s}.png`, await fullSquare(s));
}
// Maskable launcher icon — the mark with generous padding (adaptive-safe, fills the bubble).
fs.writeFileSync("public/maskable-icon-512x512.png", await markSquare(512, 0.66));
// iOS home icon (no mask) — the mark, a touch larger.
fs.writeFileSync("public/apple-touch-icon-180x180.png", await markSquare(180, 0.78));
// Favicon + in-app BrandMark tile — the mark.
fs.writeFileSync("public/app-icon.png", await markSquare(512, 0.72));
fs.writeFileSync("public/favicon.png", await markSquare(64, 0.78));

console.log("wrote pwa-{64,192,512} (full logo), maskable + apple-touch + app-icon + favicon (mark),");
console.log("and public/brand/costcraft-{logo,mark}.png — background", BG);
