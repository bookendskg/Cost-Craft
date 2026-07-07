// Build the app catalog (materials, in-house prep, dishes, packaging) from the
// hand-formatted costing workbook "Reicpe for moin.xlsx" using the full costing
// model, and emit src/lib/data/moin.generated.json.
//
//   node scripts/build-moin-seed.mjs
//
// Model: every ingredient line becomes a Raw Material (₹/g from the sheet) unless
// its name matches an in-house sub-recipe block, in which case the dish/prep links
// to that prep. Costs are resolved bottom-up (materials → preps → dishes); dish
// selling price is back-derived from the sheet's food-cost %.

import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";

const SEED_TS = "2026-06-01T09:00:00.000Z";
const SEED_DATE = "2026-06-01";
const OWNER = "u-owner";
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const slug = (v) => norm(v).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
const num = (v) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));

// ── Parse workbook into blocks ────────────────────────────────────────────────
const wb = XLSX.read(readFileSync("Reicpe for moin.xlsx"), { type: "buffer" });

/** Two desserts are assembled in "final plating" blocks (no % header). */
const DESSERT_NAME = { "final plating": "Tiramisu", "millie feuille final plating": "Millie Feuille" };

function parseSheet(rows, brand) {
  const out = [];
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const a = norm(rows[r]?.[c]);
      const b = norm(rows[r]?.[c + 1]);
      const isHead = (a === "ingredients" || a === "ingredient" || a === "component") && (b.startsWith("gram") || b.startsWith("quantity"));
      const isPkg = a.startsWith("packaging item");
      if (!isHead && !isPkg) continue;
      let title = "";
      for (let rr = r - 1; rr >= 0 && rr >= r - 3; rr--) {
        const t = String(rows[rr]?.[c] ?? "").trim();
        if (t) { title = t; break; }
      }
      const pctM = title.match(/([\d.]+)\s*%/);
      const pct = pctM ? Number(pctM[1]) : null;
      let cleanTitle = title.replace(/\s*[\d.]+\s*%.*/, "").trim() || title;
      const lines = [];
      for (let rr = r + 1; rr < H; rr++) {
        const nm = String(rows[rr]?.[c] ?? "").trim();
        const nml = norm(nm);
        const g = rows[rr]?.[c + 1];
        const cost = rows[rr]?.[c + 2];
        if (nml === "total" || nml === "subtotal") continue;
        if (nml.startsWith("wastage") || nml.startsWith("total cost")) break;
        if (nml === "garnish") continue;
        if (nml.startsWith("packaging item")) break;
        if (["ingredients", "ingredient", "component"].includes(nml)) break;
        if (!nm) {
          if (!String(rows[rr + 1]?.[c] ?? "").trim()) break;
          continue;
        }
        const gN = num(g), cN = num(cost);
        // A named row with neither gram nor cost is a section title / the header of
        // the next stacked block (e.g. "… Pkg") — end this block there.
        if (gN == null && cN == null) break;
        lines.push({ name: nm, gram: gN, cost: cN });
      }
      if (!lines.length) continue;
      let kind = isPkg ? "pkg" : pct != null ? "dish" : "sub";
      if (DESSERT_NAME[norm(cleanTitle)]) { kind = "dish"; cleanTitle = DESSERT_NAME[norm(cleanTitle)]; }
      out.push({ brand, title: cleanTitle, norm: norm(cleanTitle), pct, kind, lines });
    }
  }
  return out;
}

const blocks = [];
for (const [sheet, brand] of [["Capiche", "capiche"], ["Aiko", "aiko"]]) {
  if (!wb.Sheets[sheet]) continue;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, blankrows: false, defval: "" });
  blocks.push(...parseSheet(rows, brand));
}

const subBlocks = blocks.filter((b) => b.kind === "sub");
const dishBlocks = blocks.filter((b) => b.kind === "dish");
const pkgBlocks = blocks.filter((b) => b.kind === "pkg");
const recipeByNorm = new Map(); // norm name -> {id,type,brand} for prep + dish (components)
for (const b of [...subBlocks, ...dishBlocks]) {
  const id = (b.kind === "sub" ? "r-prep-" : "r-dish-") + slug(b.title) + "-" + b.brand;
  b.id = id;
  if (!recipeByNorm.has(b.norm)) recipeByNorm.set(b.norm, { id, type: "recipe", brand: b.brand, kind: b.kind });
}

// ── Materials: any line name that isn't a sub/dish block ──────────────────────
const isRecipeName = (n) => recipeByNorm.has(n);
const KW = [
  [/oil$/, "Oils & Fats"], [/(cheese|cream|milk|butter|mascarpone|mozz|burrata|parmesan|ganache)/, "Dairy"],
  [/(flour|dough|pasta|rice|spaghetti|bucatini|noodle|sponge|breadcrumb|maida|sheet|bagel|pangrattato)/, "Grains & Flour"],
  [/(salt|pepper|paper|powder|seed|spice|msg|turmeric|cumin|cinnamon|clove|cardamom|sesame|chilli flake|paprika|corn ?flour|baking)/, "Spices"],
  [/(sauce|mayo|vinegar|ponzu|gochujang|guac|slurry|tamarind|ketchup|sriracha|honey|jam|syrup|paste|soy|oyster|shao|wine)/, "Sauces & Condiments"],
  [/(onion|garlic|ginger|chilli|chili|pepper|paprika|mushroom|carrot|beet|basil|parsley|coriander|mint|leek|zucchini|babycorn|bellpepper|scallion|leaves|lotus|edamame|broccoli|jalapeno|lemongrass|kafir|sprout|spring)/, "Vegetables"],
  [/(sugar|yeast|malt|glucose|caster|milkmaid)/, "Bakery"],
  [/(water|ice|jasmin|soda)/, "Beverages"],
  [/(almond|pista|pistachio|chestnut|nut)/, "Dry Fruits"],
];
const catFor = (name) => { const n = norm(name); for (const [re, cat] of KW) if (re.test(n)) return cat; return "Uncategorised"; };
const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const DISH_CAT = [
  [/pizza/, "Pizza"], [/(fettuccine|pomodoro|alfredo|pasta|spaghetti)/, "Pasta"], [/(roll|sushi|maki)/, "Sushi"],
  [/noodle/, "Noodles"], [/rice|risotto/, "Rice"], [/dumpling|gyoza|bao|momo/, "Small Plates"],
  [/(tiramisu|feuille|dessert|cake)/, "Dessert"], [/(curry|tteokbokki)/, "Mains"],
];
const dishCat = (name) => { const n = norm(name); for (const [re, cat] of DISH_CAT) if (re.test(n)) return cat; return "Mains"; };

const matByNorm = new Map(); // norm -> {id,name,obs:[perGram]}
for (const b of [...subBlocks, ...dishBlocks]) {
  for (const ln of b.lines) {
    const n = norm(ln.name);
    if (isRecipeName(n)) continue; // it's a prep/dish, not a material
    let m = matByNorm.get(n);
    if (!m) { m = { id: "m-" + slug(ln.name), name: clean(ln.name), obs: [] }; matByNorm.set(n, m); }
    if (ln.gram && ln.gram > 0 && ln.cost != null && ln.cost > 0) m.obs.push(ln.cost / ln.gram);
  }
}
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };
const raw_materials = [...matByNorm.values()].map((m) => {
  const perGram = round2(median(m.obs) * 1000) / 1000; // ₹/g, 3dp
  return {
    id: m.id, ingredient_name: m.name, category: catFor(m.name), notes: null,
    purchase_price: round2(perGram * 1000), purchase_quantity: 1, purchase_unit: "KG",
    base_unit: "Gram", cost_per_base_unit: perGram, last_price_update: SEED_DATE,
    status: "active", created_by: OWNER, created_at: SEED_TS,
  };
});
const matUnit = new Map(raw_materials.map((m) => [norm(m.ingredient_name), m.cost_per_base_unit]));

// ── Resolve costs bottom-up (materials known; preps iterate for nesting) ──────
const unitCost = new Map(); // recipe id -> ₹/g
function lineUnit(name) {
  const n = norm(name);
  const rec = recipeByNorm.get(n);
  if (rec) return unitCost.get(rec.id) ?? 0;
  return matUnit.get(n) ?? 0;
}
const blockYield = (b) => b.lines.reduce((s, l) => s + (l.gram || 0), 0);
for (let pass = 0; pass < 6; pass++) {
  for (const b of subBlocks) {
    const sub = b.lines.reduce((s, l) => s + (l.gram || 0) * lineUnit(l.name), 0);
    const total = sub * 1.05;
    const y = blockYield(b) || 1;
    unitCost.set(b.id, total / y);
  }
}

// ── Emit recipes + recipe_ingredients ────────────────────────────────────────
const recipes = [];
const recipe_ingredients = [];
const recipe_versions = [];
let unmatched = new Set();
function emitRecipe(b, isPrep) {
  const y = blockYield(b) || 1;
  let sub = 0;
  b.lines.forEach((l, i) => {
    const u = lineUnit(l.name);
    if (u === 0 && !(l.cost === 0)) unmatched.add(l.name.trim());
    const rec = recipeByNorm.get(norm(l.name));
    const cost = round2((l.gram || 0) * u);
    sub += (l.gram || 0) * u;
    recipe_ingredients.push({
      id: `${b.id}-i${i}`, recipe_id: b.id,
      ingredient_id: rec ? rec.id : (matByNorm.get(norm(l.name))?.id ?? "m-" + slug(l.name)),
      component_type: rec ? "recipe" : "material",
      quantity_used: l.gram ?? 0, unit_used: "Gram", calculated_cost: cost, sort_order: i,
    });
  });
  const total = round2(sub * 1.05);
  const selling = !isPrep && b.pct ? round2(total / (b.pct / 100)) : null;
  recipes.push({
    id: b.id, recipe_name: clean(b.title), category: isPrep ? "In-House Prep" : dishCat(b.title),
    brand: b.brand, description: null, method: [], image_url: null, preparation_time: isPrep ? 60 : null,
    serving_size: 1, status: "approved", selling_price: selling, packaging_cost: 0,
    total_cost: total, cost_per_portion: total, wastage_pct: 5, is_prep: isPrep,
    yield_quantity: y, yield_unit: "Gram", created_by: OWNER, approved_by: OWNER, approved_at: SEED_TS,
    rejection_note: null, version_no: 1, created_at: SEED_TS, updated_at: SEED_TS, updated_by: OWNER,
    total_weight_g: y,
  });
  recipe_versions.push({ id: `${b.id}-v1`, recipe_id: b.id, version_no: 1, snapshot: null, notes: "Imported from costing sheet", created_by: OWNER, created_at: SEED_TS });
}
for (const b of subBlocks) emitRecipe(b, true);
for (const b of dishBlocks) emitRecipe(b, false);

// ── Packaging ─────────────────────────────────────────────────────────────────
const pkgByNorm = new Map();
const packaging_items = [];
const recipe_packaging = [];
for (const b of pkgBlocks) {
  // link to a dish whose title matches the pkg title (minus a trailing "pkg"),
  // allowing a prefix match so "cheese & chilli dumplings" ↔ "… 5 pcs".
  const dishNorm = b.norm.replace(/\bpkg\b/g, "").replace(/\s+/g, " ").trim();
  const dish =
    dishBlocks.find((d) => d.norm === dishNorm || d.norm === b.norm) ||
    dishBlocks.find((d) => d.norm.startsWith(dishNorm) || dishNorm.startsWith(d.norm));
  for (const l of b.lines) {
    const n = norm(l.name);
    let p = pkgByNorm.get(n);
    if (!p) {
      p = { id: "pkg-" + slug(l.name), name: clean(l.name), normalized_name: n, packaging_type: "primary", unit: "Piece", unit_price: l.gram ?? 0, status: "active", notes: null, created_by: OWNER, created_at: SEED_TS, updated_by: OWNER, updated_at: SEED_TS };
      pkgByNorm.set(n, p); packaging_items.push(p);
    }
    if (dish) recipe_packaging.push({ id: `${dish.id}-p-${p.id}`, recipe_id: dish.id, packaging_item_id: p.id, quantity_used: 1 });
  }
}

// Roll each dish's packaging lines up into its stored packaging_cost so the
// dashboard's "PKG ₹" column and FC% (with pkg) reflect it (it reads the stored
// field, not the live recipe_packaging lines).
const pkgPrice = new Map(packaging_items.map((p) => [p.id, p.unit_price]));
const pkgCostByRecipe = new Map();
for (const rp of recipe_packaging) {
  const add = (rp.quantity_used || 0) * (pkgPrice.get(rp.packaging_item_id) || 0);
  pkgCostByRecipe.set(rp.recipe_id, (pkgCostByRecipe.get(rp.recipe_id) || 0) + add);
}
for (const r of recipes) {
  if (pkgCostByRecipe.has(r.id)) r.packaging_cost = round2(pkgCostByRecipe.get(r.id));
}

const payload = { raw_materials, recipes, recipe_ingredients, recipe_versions, packaging_items, recipe_packaging };
const outFile = "src/lib/data/moin.generated.json";
writeFileSync(outFile, JSON.stringify(payload, null, 2));
writeFileSync("data/moin.generated.json", JSON.stringify(payload, null, 2)); // /data copy

console.log("Wrote", outFile, "and data/moin.generated.json");
console.table({
  materials: raw_materials.length, dishes: dishBlocks.length, preps: subBlocks.length,
  recipe_lines: recipe_ingredients.length, packaging_items: packaging_items.length, recipe_packaging: recipe_packaging.length,
});
console.log("\nDishes:", dishBlocks.map((d) => `${d.title} [${d.brand}] ${d.pct ?? "-"}%`).join(" · "));
if (unmatched.size) console.log("\nZero-cost/unmatched ingredient names (", unmatched.size, "):\n ", [...unmatched].sort().join(" | "));
