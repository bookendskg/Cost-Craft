import { writeFileSync } from "node:fs";
import { buildSeed } from "../src/lib/data/seed";
import { PANKIL_ITEMS } from "../src/lib/data/pankilPrices";
import { VEG_FRUIT_ITEMS } from "../src/lib/data/vegFruitPrices";

const SCRATCH = process.argv[2];
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const db = buildSeed();

const matById = new Map(db.raw_materials.map((m) => [m.id, m]));
const recName = new Map(db.recipes.map((r) => [r.id, r.recipe_name]));
const useCount = new Map<string, number>();
const usingRecipes = new Map<string, Set<string>>();
for (const ri of db.recipe_ingredients) {
  if ((ri.component_type ?? "material") !== "material") continue;
  useCount.set(ri.ingredient_id, (useCount.get(ri.ingredient_id) ?? 0) + 1);
  if (!usingRecipes.has(ri.ingredient_id)) usingRecipes.set(ri.ingredient_id, new Set());
  usingRecipes.get(ri.ingredient_id)!.add(recName.get(ri.recipe_id) ?? ri.recipe_id);
}

// 1) Exact-name duplicate material groups (normalised name → multiple ids)
const byName = new Map<string, typeof db.raw_materials>();
for (const m of db.raw_materials) {
  const k = norm(m.ingredient_name);
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k)!.push(m);
}
const exactDups = [...byName.entries()].filter(([, ms]) => ms.length > 1);

// 2) Orphan materials (in catalogue but used by NO recipe)
const orphans = db.raw_materials.filter((m) => !useCount.has(m.id));

// 3) Used-but-unpriced ingredients (the reconciliation work-list)
const unpriced = [...useCount.keys()]
  .map((id) => matById.get(id))
  .filter((m): m is NonNullable<typeof m> => !!m && m.cost_per_base_unit == null)
  .map((m) => ({
    id: m.id,
    name: m.ingredient_name,
    category: m.category,
    usedInLines: useCount.get(m.id) ?? 0,
    recipes: [...(usingRecipes.get(m.id) ?? [])].slice(0, 5),
  }))
  .sort((a, b) => b.usedInLines - a.usedInLines);

const candidates = [
  ...PANKIL_ITEMS.map((i) => ({ name: i.name, category: i.category, perGram: i.perGram, src: "pankil" })),
  ...VEG_FRUIT_ITEMS.map((i) => ({ name: i.name, category: i.category, perGram: i.perGram, src: "produce" })),
];

console.log(JSON.stringify({ materials: db.raw_materials.length, exactDupGroups: exactDups.length, orphans: orphans.length, unpriced: unpriced.length }));
console.log("\nExact-name duplicate groups (" + exactDups.length + "):");
for (const [k, ms] of exactDups.slice(0, 40)) console.log("  " + k + "  ×" + ms.length + "  [" + ms.map((m) => m.id).join(", ") + "]");

// Write reconciliation chunks for the workflow
const SIZE = 28;
const chunks: typeof unpriced[] = [];
for (let i = 0; i < unpriced.length; i += SIZE) chunks.push(unpriced.slice(i, i + SIZE));
if (SCRATCH) {
  chunks.forEach((c, i) => writeFileSync(SCRATCH + "/pankil-chunk-" + i + ".json", JSON.stringify({ chunkIndex: i, items: c, candidates }, null, 1)));
  writeFileSync("scripts/.dedup-data.json", JSON.stringify({ exactDups: exactDups.map(([k, ms]) => ({ name: k, ids: ms.map((m) => m.id) })), orphans: orphans.map((m) => ({ id: m.id, name: m.ingredient_name })) }, null, 1));
  console.log("\nwrote " + chunks.length + " pankil chunks to scratchpad; unpriced=" + unpriced.length + " candidates=" + candidates.length);
}
