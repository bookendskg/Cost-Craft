// Bundles the shared MCP tool layer for the hosted Edge Function.
//
// The function can't import src/ directly: those modules use "@/…" aliases and
// extensionless imports, which Deno won't resolve. So everything is pre-bundled
// into one ESM file that supabase/functions/mcp-http/index.ts imports.

import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outfile = resolve(root, "supabase/functions/mcp-http/_bundle.js");
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(root, "mcp/src/httpEntry.ts")],
  bundle: true,
  // Neutral: this runs in Deno, not Node — nothing here may touch node: builtins.
  platform: "neutral",
  format: "esm",
  target: "es2022",
  mainFields: ["module", "main"],
  conditions: ["import", "module", "default"],
  outfile,
  alias: {
    // Repos import the browser Supabase client; the hosted server swaps in the
    // per-request one.
    "@/lib/supabase/client": resolve(root, "mcp/src/supabaseServerClient.ts"),
    "@": resolve(root, "src"),
  },
  logLevel: "info",
});
