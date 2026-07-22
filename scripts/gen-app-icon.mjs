// Generate the PWA icon set + brand assets from the official Kost Kraft artwork in
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

const SRC_MARK = "assets/kostkraft-mark.png"; // infinity mark (transparent)
const SRC_FULL = "assets/kostkraft-full.png"; // full logo + wordmark (on dark bg)
const BG = "#010c12"; // sampled from the artwork

fs.mkdirSync("public/brand", { recursive: true });
// The full logo is used as-is by the boot splash (index.html) + Splash.tsx.
fs.copyFileSync(SRC_FULL, "public/brand/kostkraft-logo.png");
// The mark is exposed as a brand asset but is NOT referenced by the app (the
// in-app tile uses /app-icon.png). Everything under public/ is precached by the
// service worker, so emit a trimmed, web-sized copy rather than the multi-MB
// source — shipping the raw art added ~2 MB to every install.
const markAsset = await sharp(SRC_MARK)
  .trim()
  .resize({ width: 512, fit: "inside", withoutEnlargement: true })
  .png({ compressionLevel: 9 })
  .toBuffer();
fs.writeFileSync("public/brand/kostkraft-mark.png", markAsset);

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
console.log("and public/brand/kostkraft-{logo,mark}.png — background", BG);
