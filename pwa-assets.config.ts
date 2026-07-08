import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Generates the full PWA icon set (192/512/maskable, apple-touch, favicon) from
// one source at build time — wired into vite-plugin-pwa via `pwaAssets`.
export default defineConfig({
  preset: minimal2023Preset,
  images: ["public/app-icon.svg"],
});
