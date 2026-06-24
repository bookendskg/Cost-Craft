import { describe, it, expect } from "vitest";
import { recomputeAndPropagate, recomputeRecipe } from "./mock/recompute";
import type { MockDb } from "./mock/db";

function emptyDb(): MockDb {
  return {
    users: [],
    raw_materials: [],
    recipes: [],
    recipe_ingredients: [],
    recipe_cost_history: [],
    ingredient_price_history: [],
    recipe_versions: [],
    user_recipe_views: [],
    audit_logs: [],
    system_settings: [],
  } as unknown as MockDb;
}

function mat(db: MockDb, id: string, cpbu: number | null) {
  db.raw_materials.push({
    id, ingredient_name: id, category: "x", supplier_name: null,
    purchase_price: 1, purchase_quantity: 1, purchase_unit: "Gram",
    base_unit: "Gram", cost_per_base_unit: cpbu, last_price_update: null,
    status: "active", created_by: null, created_at: "t",
  } as any);
}

function recipe(db: MockDb, id: string, yieldQty: number, yieldUnit = "Gram") {
  db.recipes.push({
    id, recipe_name: id, category: "x", brand: "capiche", description: null,
    image_url: null, preparation_time: null, serving_size: 1, status: "draft",
    total_cost: 0, cost_per_portion: 0, selling_price: null, is_prep: true,
    yield_quantity: yieldQty, yield_unit: yieldUnit, created_by: null,
    approved_by: null, approved_at: null, rejection_note: null, version_no: 1,
    created_at: "t", updated_at: "t", updated_by: null,
  } as any);
}

let counter = 0;
function line(db: MockDb, recipeId: string, ingredientId: string, type: "material" | "recipe", qty: number, unit = "Gram") {
  db.recipe_ingredients.push({
    id: `li-${counter++}`, recipe_id: recipeId, ingredient_id: ingredientId,
    component_type: type, quantity_used: qty, unit_used: unit,
    calculated_cost: null, sort_order: 0,
  } as any);
}

describe("ADVERSARIAL: guard cap leaves stale prep total in a diamond", () => {
  it("over-converging parent stops at cap with stale child cost", () => {
    const db = emptyDb();
    // Leaf material
    mat(db, "M", 1); // 1 currency / gram
    // 7 prep recipes P0..P6 each using M (so the parent C is enqueued by each)
    // C uses all of P0..P6 as sub-recipes. After M changes, cascade seeds P0..P6.
    // Each Pi changes -> enqueues C. C enqueued 7 times -> 7th processing hits cap (>6) -> skipped.
    recipe(db, "C", 100);
    for (let i = 0; i < 7; i++) {
      recipe(db, `P${i}`, 100);
      line(db, `P${i}`, "M", "material", 100);   // each prep costs 100
      line(db, "C", `P${i}`, "recipe", 100);     // C uses 100g of each prep
    }
    // Initialise everything from scratch
    recomputeAndPropagate(db, ["P0","P1","P2","P3","P4","P5","P6"], null, "init");

    const C = db.recipes.find(r => r.id === "C")!;
    // Each prep: total_cost = 100. prepUnitCost = 100/100 = 1 per gram. C uses 100g each => 100 per prep.
    // 7 preps => C total should be 700.
    const correct = 7 * 100;

    // Recompute C directly from scratch to get the ground-truth total:
    recomputeRecipe(db, "C", null, "verify");
    const groundTruth = db.recipes.find(r => r.id === "C")!.total_cost;
    expect(groundTruth).toBe(correct); // sanity: direct recompute is correct

    console.log("C total after cascade:", C.total_cost, "ground truth:", groundTruth);
  });
});

describe("ADVERSARIAL: incompatible unit on a recipe line silently uses factor 1", () => {
  it("ML used against a Gram-yield prep produces a silently-wrong (not null) cost", () => {
    const db = emptyDb();
    mat(db, "M", 1);
    recipe(db, "PREP", 1000, "Gram"); // yields in Gram
    line(db, "PREP", "M", "material", 1000); // PREP total 1000, unit cost 1/g
    recipe(db, "DISH", 1);
    line(db, "DISH", "PREP", "recipe", 50, "ML"); // INCOMPATIBLE: ML vs Gram

    recomputeAndPropagate(db, ["PREP"], null, "init");
    recomputeRecipe(db, "DISH", null, "init");

    const dishLine = db.recipe_ingredients.find(l => l.recipe_id === "DISH")!;
    console.log("DISH line cost with ML-vs-Gram mismatch:", dishLine.calculated_cost);
    // factor silently = 1 -> 1 * 50 * 1 = 50, NOT null, NOT flagged.
    expect(dishLine.calculated_cost).toBe(50);
  });
});

describe("ADVERSARIAL: changed compares rounded vs possibly-null old total", () => {
  it("first recompute from null total", () => {
    const db = emptyDb();
    recipe(db, "R", 1);
    const r = db.recipes.find(x => x.id === "R")!;
    (r as any).total_cost = null;
    const changed = recomputeRecipe(db, "R", null, "x");
    console.log("changed when old null, new 0:", changed, "history written?");
  });
});
