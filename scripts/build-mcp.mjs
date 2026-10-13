// Builds the MCP connector as ONE self-contained file and puts it in public/, so the
// deployed site serves it at /mcp/kostkraft-mcp.mjs. Users download that file and
// run it with Node — they never clone this repo.
//
// The project's URL + anon key (both already public in the browser bundle) are baked
// in at build time, so a downloaded connector knows which KostKraft it belongs to and
// needs no environment variables.

import { build } from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Read VITE_ vars from the environment, falling back to a local .env file. */
function publicEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    const path = resolve(root, file);
    if (!existsSync(path)) continue;
    const line = readFileSync(path, "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith(`${name}=`));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
  }
  return "";
}

const url = publicEnv("VITE_SUPABASE_URL");
const anonKey = publicEnv("VITE_SUPABASE_ANON_KEY");
if (!url || !anonKey) {
  console.warn(
    "[mcp] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not found — building a connector that asks the user for them.",
  );
}

const outfile = resolve(root, "public/mcp/kostkraft-mcp.mjs");
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: [resolve(root, "mcp/src/cli.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile,
  alias: {
    // The repos import the browser Supabase client; swap it for the Node one.
    "@/lib/supabase/client": resolve(root, "mcp/src/supabaseClient.ts"),
    "@": resolve(root, "src"),
  },
  define: {
    __KOSTKRAFT_URL__: JSON.stringify(url),
    __KOSTKRAFT_ANON_KEY__: JSON.stringify(anonKey),
  },
  logLevel: "info",
});
