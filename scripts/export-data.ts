// One-shot snapshot of the full seeded dataset → /data/*.json (a backup archive).
// Run with vite-node so TS + the "@/" alias resolve:
//   npx vite-node scripts/export-data.ts
// buildSeed() is the canonical FULL dataset, so this can be re-run any time to
// regenerate the backup even though the live app now starts with an empty catalog.

import { writeFileSync, mkdirSync } from "node:fs";
import { buildSeed } from "../src/lib/data/seed";

const db = buildSeed();

mkdirSync("data", { recursive: true });
writeFileSync("data/mockdb.full.json", JSON.stringify(db, null, 2));

const counts: Record<string, number> = {};
for (const [table, rows] of Object.entries(db)) {
  writeFileSync(`data/${table}.json`, JSON.stringify(rows, null, 2));
  counts[table] = Array.isArray(rows) ? rows.length : 0;
}

console.log("Exported /data snapshot:");
console.table(counts);
