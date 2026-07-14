// Generate the app icon + brand assets from the official CostCraft artwork in
// assets/. Produces public/app-icon.png (square, dark bg + centered mark — source
// for the PWA icon set), copies the full logo + mark into public/brand/, and prints
// the sampled background colour used across the manifest / splash.
//
// Run: node scripts/gen-app-icon.mjs
import sharp from "sharp";
import fs from "node:fs";

const SRC_MARK = "assets/costcraftt.png"; // infinity mark
const SRC_FULL = "assets/costcraft db.png"; // full logo + wordmark

fs.mkdirSync("public/brand", { recursive: true });
fs.copyFileSync(SRC_FULL, "public/brand/costcraft-logo.png");
fs.copyFileSync(SRC_MARK, "public/brand/costcraft-mark.png");

// Sample the logo's edge (corner) colour so the splash/icon backgrounds blend with it.
const { data, info } = await sharp(SRC_FULL).raw().toBuffer({ resolveWithObject: true });
const o = (5 * info.width + 5) * info.channels;
const bg = `#${[data[o], data[o + 1], data[o + 2]].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

// Square app icon: the mark (trimmed) centered on the brand bg at ~72% (maskable-safe).
const mark = await sharp(SRC_MARK).trim().resize({ width: Math.round(512 * 0.72) }).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: bg } })
  .composite([{ input: mark, gravity: "center" }])
  .png()
  .toFile("public/app-icon.png");
await sharp("public/app-icon.png").resize(64).png().toFile("public/favicon.png");

console.log("brand background:", bg);
console.log("wrote public/app-icon.png, public/favicon.png, public/brand/costcraft-{logo,mark}.png");
