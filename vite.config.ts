/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Generate the icon set (192/512/maskable, apple-touch, favicon) from
      // public/app-icon.svg via pwa-assets.config.ts and inject them.
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        id: "/",
        name: "CostCraft — Recipe Costing",
        short_name: "CostCraft",
        description: "Recipe costing, yield and wastage for Bookends Hospitality — Capiche & Aiko.",
        theme_color: "#010c12",
        background_color: "#010c12",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["business", "productivity", "food"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // SPA fallback: the service worker serves index.html for app routes so
        // deep-link refreshes work (even offline) once the SW is active.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/assets\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Bind to 0.0.0.0 so the app is reachable from other devices on the LAN
  // (phones/tablets/other PCs) at http://<this-machine-ip>:<port>.
  server: { host: true, port: 3005, strictPort: false },
  preview: { host: true, port: 4173, strictPort: false },
  build: {
    // pdfmake + its embedded fonts are unavoidably large but are lazy-loaded
    // (dynamic import on export), so don't warn about that known chunk.
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Split heavy/optional vendors into their own chunks so they load only
        // when needed (pdf/excel export) and keep the initial bundle small.
        manualChunks: {
          "vendor-pdf": ["pdfmake"],
          "vendor-xlsx": ["xlsx"],
          "vendor-charts": ["recharts"],
          "vendor-react": ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
