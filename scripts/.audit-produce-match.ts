import { writeFileSync } from "node:fs";
import { buildSeed } from "../src/lib/data/seed";
import { VEG_FRUIT_PRICES, VEG_FRUIT_ITEMS } from "../src/lib/data/vegFruitPrices";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const db = buildSeed();
const priceKeys = new Set(Object.keys(VEG_FRUIT_PRICES));

const matById = new Map(db.raw_materials.map((m) => [m.id, m]));
const useCount = new Map<string, number>();
const usingRecipes = new Map<string, Set<string>>();
const recName = new Map(db.recipes.map((r) => [r.id, r.recipe_name]));
for (const ri of db.recipe_ingredients) {
  if ((ri.component_type ?? "material") !== "material") continue;
  useCount.set(ri.ingredient_id, (useCount.get(ri.ingredient_id) ?? 0) + 1);
  if (!usingRecipes.has(ri.ingredient_id)) usingRecipes.set(ri.ingredient_id, new Set());
  usingRecipes.get(ri.ingredient_id)!.add(recName.get(ri.recipe_id) ?? ri.recipe_id);
}

const used = [...useCount.keys()].map((id) => matById.get(id)).filter(Boolean) as typeof db.raw_materials;
const matched = used.filter((m) => priceKeys.has(norm(m.ingredient_name)));
const unmatched = used.filter((m) => !priceKeys.has(norm(m.ingredient_name)));

// Likely-produce among the unmatched: category Vegetables/Fruits, OR a produce-ish name token.
const PRODUCE_CAT = new Set(["Vegetables", "Fruits", "Produce", "Herbs"]);
const NAME_HINT =
  /(mango|apple|banana|grape|berry|lemon|lime|orange|melon|pear|peach|plum|kiwi|avocado|fig|guava|papaya|pineapple|pomegranate|onion|tomato|potato|carrot|beet|garlic|ginger|chilli|chili|pepper|capsicum|cucumber|lettuce|spinach|basil|mint|coriander|cilantro|parsley|rocket|arugula|cabbage|broccoli|cauliflower|mushroom|corn|pea|bean|sprout|lime|leek|celery|radish|turnip|pumpkin|zucchini|squash|eggplant|brinjal|okra|leaf|leaves|herb|cherry|date|raisin|coconut|lychee|dragon|passion|grapefruit|tangerine|clementine|scallion|shallot|chive|thyme|rosemary|oregano|sage|dill|fennel|asparagus|artichoke|kale|chard|cress|microgreen|edible flower)/i;
const produceUnmatched = unmatched
  .filter((m) => PRODUCE_CAT.has(m.category) || NAME_HINT.test(m.ingredient_name))
  .map((m) => ({
    id: m.id,
    name: m.ingredient_name,
    category: m.category,
    perGram: m.cost_per_base_unit,
    usedInLines: useCount.get(m.id) ?? 0,
    recipes: [...(usingRecipes.get(m.id) ?? [])].slice(0, 6),
  }))
  .sort((a, b) => (b.usedInLines ?? 0) - (a.usedInLines ?? 0));

const candidates = VEG_FRUIT_ITEMS.map((i) => ({ name: i.name, category: i.category, perGram: i.perGram }));

const out = { summary: { used: used.length, matched: matched.length, unmatched: unmatched.length, produceUnmatched: produceUnmatched.length }, produceUnmatched, candidates };
writeFileSync("scripts/.produce-match.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.summary));
console.log("\nProduce-like ingredients with NO price-file match (used in recipes):");
for (const p of produceUnmatched) console.log(`  ${p.usedInLines}×  ${p.name}  [${p.category}]  ₹/g=${p.perGram ?? "null"}  e.g. ${p.recipes.slice(0, 3).join(", ")}`);
