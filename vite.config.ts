/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
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
