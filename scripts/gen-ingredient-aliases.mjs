// Generate src/lib/data/ingredientAliases.ts by merging both verified reconciliations
// (produce + Pankil). Maps a recipe-ingredient spelling/prep variant to the canonical
// price-master name (produce or Pankil), so e.g. "Alfanso mango"→"Alphonso Mango",
// "Cooked arborio rice"→"Arborio Rice", "Mozzarella (shredded)"→"Mozzarella Cheese".
// Only verifier-confirmed matches with proposer confidence ≥ 0.6 are baked in.
// Run: node scripts/gen-ingredient-aliases.mjs
import { readFileSync, writeFileSync } from "node:fs";

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();
const SOURCES = ["scripts/.produce-reconcile.json", "scripts/.pankil-reconcile.json"];

const map = {};
const low = [];
for (const f of SOURCES) {
  const d = JSON.parse(readFileSync(f, "utf8"));
  for (const r of d.reconcile) {
    if (!r.match) continue;
    if (r.confidence >= 0.6) map[norm(r.ingredient)] = r.match;
    else low.push(`${r.ingredient}→${r.match} (${r.confidence})`);
  }
}

const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
const header = `// AUTO-GENERATED — merged produce + Pankil reconciliations (gen-ingredient-aliases.mjs).
// recipe-ingredient name (normalised) → canonical price-master name (produce or Pankil).
// Only verifier-confirmed matches (confidence ≥ 0.6) are included. Do not edit by hand.

export const INGREDIENT_ALIASES: Record<string, string> = ${JSON.stringify(sorted, null, 2)};
`;

writeFileSync("src/lib/data/ingredientAliases.ts", header);
console.log(`Wrote ${Object.keys(map).length} ingredient aliases (skipped ${low.length} low-confidence)`);
if (low.length) console.log("  low-conf:", low.join(", "));
