// Generate gap reports: recipes/ingredients with no price, split into "needs a price"
// vs "should be a sub-recipe" (composite). Outputs an Excel workbook + CSVs + a markdown
// summary into reports/.  Run: npx vite-node scripts/gen-missing-report.ts
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { buildSeed } from "../src/lib/data/seed";

const db = buildSeed();
const matById = new Map(db.raw_materials.map((m) => [m.id, m]));
const recById = new Map(db.recipes.map((r) => [r.id, r]));
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Composite (in-house preparation) detection — from the verified reconciliations + a name heuristic.
const compositeSet = new Set<string>();
for (const f of ["scripts/.pankil-reconcile.json", "scripts/.produce-reconcile.json"]) {
  if (existsSync(f)) {
    const d = JSON.parse(readFileSync(f, "utf8"));
    for (const c of d.composite ?? []) compositeSet.add(norm(c));
  }
}
const COMPOSITE_RE = /\b(sauce|paste|stock|tare|dashi|marinade|dressing|\bdip\b|broth|glaze|coulis|\bjus\b|reduction|keema|filling|tempura flex|shoyu|ponzu|teriyaki|hakka|schezwan|sichuan mix)\b/i;
const isComposite = (name: string) => compositeSet.has(norm(name)) || COMPOSITE_RE.test(name);

interface IngGap { name: string; category: string; kind: "needs price" | "composite"; recipes: Set<string> }
const byIng = new Map<string, IngGap>();
const byRecipe = new Map<string, { recipe: string; brand: string; category: string; missing: Set<string> }>();

for (const ri of db.recipe_ingredients) {
  if ((ri.component_type ?? "material") !== "material") continue;
  const m = matById.get(ri.ingredient_id);
  const r = recById.get(ri.recipe_id);
  if (!m || !r || r.parent_recipe_id) continue; // master recipes only (avoid 11" duplicates)
  if (m.cost_per_base_unit != null) continue; // already priced
  const kind = isComposite(m.ingredient_name) ? "composite" : "needs price";
  const key = norm(m.ingredient_name);
  if (!byIng.has(key)) byIng.set(key, { name: m.ingredient_name, category: m.category, kind, recipes: new Set() });
  byIng.get(key)!.recipes.add(r.recipe_name);
  if (!byRecipe.has(r.id)) byRecipe.set(r.id, { recipe: r.recipe_name, brand: r.brand, category: r.category, missing: new Set() });
  byRecipe.get(r.id)!.missing.add(m.ingredient_name);
}

const ings = [...byIng.values()].sort((a, b) => b.recipes.size - a.recipes.size || a.name.localeCompare(b.name));
const needPrice = ings.filter((i) => i.kind === "needs price").map((i) => ({ Ingredient: i.name, Category: i.category, "Used in # Recipes": i.recipes.size, "Price ₹/kg (FILL IN)": "", Recipes: [...i.recipes].sort().join("; ") }));
const composites = ings.filter((i) => i.kind === "composite").map((i) => ({ Ingredient: i.name, Category: i.category, "Used in # Recipes": i.recipes.size, Recipes: [...i.recipes].sort().join("; ") }));
const recipes = [...byRecipe.values()].sort((a, b) => b.missing.size - a.missing.size || a.recipe.localeCompare(b.recipe)).map((r) => ({ Recipe: r.recipe, Brand: r.brand, Category: r.category, "# Missing": r.missing.size, "Missing Ingredients": [...r.missing].sort().join("; ") }));
const yieldsMissing = db.ingredient_yields
  .filter((y) => { const m = matById.get(y.ingredient_id); return (y.purchase_cost ?? 0) <= 0 || m == null || m.cost_per_base_unit == null; })
  .map((y) => ({ Ingredient: matById.get(y.ingredient_id)?.ingredient_name ?? y.ingredient_id, "Yield %": y.yield_percentage, "Price ₹/kg (FILL IN)": "" }));

mkdirSync("reports", { recursive: true });
const sheet = (rows: object[]) => XLSX.utils.json_to_sheet(rows.length ? rows : [{ "(none)": "" }]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheet(needPrice), "Need Price");
XLSX.utils.book_append_sheet(wb, sheet(composites), "Make Sub-Recipe");
XLSX.utils.book_append_sheet(wb, sheet(recipes), "Recipes With Gaps");
XLSX.utils.book_append_sheet(wb, sheet(yieldsMissing), "Yields Missing Price");
writeFileSync("reports/CostCraft_Missing_Price_Report.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
writeFileSync("reports/need_price.csv", XLSX.utils.sheet_to_csv(sheet(needPrice)));
writeFileSync("reports/make_sub_recipe.csv", XLSX.utils.sheet_to_csv(sheet(composites)));
writeFileSync("reports/recipes_with_gaps.csv", XLSX.utils.sheet_to_csv(sheet(recipes)));
writeFileSync("reports/yields_missing_price.csv", XLSX.utils.sheet_to_csv(sheet(yieldsMissing)));

const md = `# CostCraft — Missing Price Report

Generated from the current catalogue. "Master" recipes only (11" size children excluded — fixing a price fixes both sizes).

| Bucket | Count |
|---|---|
| Recipes with at least one unpriced ingredient | ${recipes.length} |
| Distinct ingredients that NEED A PRICE (raw/purchased) | ${needPrice.length} |
| Distinct ingredients that should be a SUB-RECIPE (composite) | ${composites.length} |
| Yields created without a price | ${yieldsMissing.length} |

## 1. Ingredients that need a price (fill the ₹/kg column)
${needPrice.map((r) => `- **${r.Ingredient}** (${r.Category}) — used in ${r["Used in # Recipes"]} recipe(s)`).join("\n")}

## 2. Composite items — should be built as a sub-recipe (no single purchase price)
${composites.map((r) => `- **${r.Ingredient}** — used in ${r["Used in # Recipes"]} recipe(s)`).join("\n")}

## 3. Yields created without a price
${yieldsMissing.map((r) => `- **${r.Ingredient}** (yield ${r["Yield %"]}%)`).join("\n")}
`;
writeFileSync("reports/MISSING_DATA_SUMMARY.md", md);

console.log(JSON.stringify({ recipesWithGaps: recipes.length, needPrice: needPrice.length, composites: composites.length, yieldsMissing: yieldsMissing.length }));
console.log("Wrote reports/CostCraft_Missing_Price_Report.xlsx + 4 CSVs + MISSING_DATA_SUMMARY.md");
