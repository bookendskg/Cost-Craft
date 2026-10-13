import { describe, it, expect } from "vitest";
import { previewMaterials, previewRecipes, previewYields } from "./previewPlan";
import { groupRecipeLines } from "./recipeGroups";
import type { ParsedRow } from "./importTypes";
import type { MaterialInput } from "../data/mock/materials";
import type { ImportYieldRow } from "../data/mock/yields";
import type { ImportRecipeLine } from "../data/mock/recipes";
import type { IngredientYield, RawMaterial, Recipe } from "../data/types";

const material = (over: Partial<RawMaterial>): RawMaterial => ({
  id: "m1", ingredient_name: "Onion", category: "Veg", notes: null,
  purchase_price: 100, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram",
  cost_per_base_unit: 0.1, last_price_update: null, status: "active",
  created_by: null, created_at: "", ...over,
});

const matInput = (over: Partial<MaterialInput>): MaterialInput => ({
  ingredient_name: "Onion", category: "Veg", notes: null,
  purchase_price: 100, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram", ...over,
});

const at = <T,>(row: number, value: T): ParsedRow<T> => ({ row, value });

describe("previewMaterials", () => {
  it("tags new, updated and unchanged rows", () => {
    const p = previewMaterials(
      "upsert",
      [at(2, matInput({})), at(3, matInput({ ingredient_name: "Onion", purchase_price: 150 })), at(4, matInput({ ingredient_name: "Kiwi" }))],
      [material({})],
    );
    // Row 2 repeats the existing values; row 3 is the same ingredient again → duplicate.
    expect(p.rows[0].status).toBe("unchanged");
    expect(p.rows[1].status).toBe("error");
    expect(p.rows[1].message).toMatch(/duplicate/i);
    expect(p.rows[2].status).toBe("new");
    expect(p.counts).toMatchObject({ unchanged: 1, error: 1, new: 1 });
  });

  it("honours the mode: add skips existing, update skips missing", () => {
    const rows = [at(2, matInput({})), at(3, matInput({ ingredient_name: "Kiwi" }))];
    const add = previewMaterials("add", rows, [material({})]);
    expect(add.rows.map((r) => r.status)).toEqual(["skip", "new"]);
    const update = previewMaterials("update", rows, [material({})]);
    expect(update.rows.map((r) => r.status)).toEqual(["unchanged", "skip"]);
  });

  it("warns about ingredients with no price", () => {
    const p = previewMaterials("upsert", [at(2, matInput({ ingredient_name: "Kiwi", purchase_price: null }))], []);
    expect(p.warnings[0]).toMatch(/no purchase price/i);
  });
});

describe("previewYields", () => {
  const yieldRow = (over: Partial<ImportYieldRow>): ImportYieldRow => ({
    ingredient_name: "Onion", name: "Chopped Onion", purchase_cost: 100,
    purchase_quantity: 1, purchase_unit: "KG", wastage_quantity: 200,
    effective_from: "2026-10-10", notes: null, ...over,
  });
  const existing = (over: Partial<IngredientYield>): IngredientYield => ({
    id: "y1", name: "Chopped Onion", ingredient_id: "m1", purchase_cost: 100,
    purchase_quantity: 1, purchase_unit: "KG", raw_quantity: 1000, raw_unit: "Gram",
    wastage_quantity: 200, wastage_unit: "Gram", usable_quantity: 800,
    wastage_percentage: 20, yield_percentage: 80, original_unit_cost: 0.1,
    yield_adjusted_unit_cost: 0.125, effective_from: "2026-10-10", notes: null,
    created_at: "", updated_at: "", created_by: null, ...over,
  });

  it("errors when the ingredient doesn't exist yet", () => {
    const p = previewYields("upsert", [at(2, yieldRow({ ingredient_name: "Ghost" }))], [material({})], []);
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].message).toMatch(/not found/i);
  });

  it("errors when wastage is at or above the raw quantity", () => {
    const p = previewYields("upsert", [at(2, yieldRow({ wastage_quantity: 1000 }))], [material({})], []);
    expect(p.rows[0].status).toBe("error");
    expect(p.rows[0].message).toMatch(/raw quantity/i);
  });

  it("matches an existing record by ingredient + prep name + date", () => {
    const same = previewYields("upsert", [at(2, yieldRow({}))], [material({})], [existing({})]);
    expect(same.rows[0].status).toBe("unchanged");

    const changed = previewYields("upsert", [at(2, yieldRow({ wastage_quantity: 300 }))], [material({})], [existing({})]);
    expect(changed.rows[0].status).toBe("update");
    expect(changed.rows[0].message).toMatch(/80% → 70%/);

    const otherPrep = previewYields("upsert", [at(2, yieldRow({ name: "Sliced Onion" }))], [material({})], [existing({})]);
    expect(otherPrep.rows[0].status).toBe("new");
  });

  it("warns about cooking weight gain (yield over 100%)", () => {
    const p = previewYields("upsert", [at(2, yieldRow({ name: "Boiled Rice", wastage_quantity: -400 }))], [material({})], []);
    expect(p.rows[0].status).toBe("new");
    expect(p.rows[0].values["Yield %"]).toBe(140);
    expect(p.warnings[0]).toMatch(/more than 100%/);
  });
});

describe("previewRecipes", () => {
  const line = (over: Partial<ImportRecipeLine>): ImportRecipeLine => ({
    recipe_name: "Tomato Sauce", category: "Sauces", size: null,
    ingredient_name: "Tomato", quantity: 500, unit: "Gram",
    selling_price: null, packaging_cost: null, ...over,
  });
  const recipe = (over: Partial<Recipe>): Recipe =>
    ({ id: "r1", recipe_name: "Tomato Sauce", size_code: null, ...over }) as Recipe;

  it("counts recipes, not rows, and lists every line", () => {
    const p = previewRecipes(
      "upsert",
      [at(2, line({})), at(3, line({ ingredient_name: "Onion", quantity: 100 })), at(4, line({ recipe_name: "Pizza Dough", ingredient_name: "Flour" }))],
      [],
      [material({ ingredient_name: "Tomato" })],
      true,
    );
    expect(p.counts.new).toBe(2); // two preps
    expect(p.rows).toHaveLength(3); // three ingredient lines
    expect(p.groups).toEqual([{ label: "preps", count: 2 }, { label: "ingredient lines", count: 3 }]);
  });

  it("splits sizes into separate recipes and matches them independently", () => {
    const rows = [
      at(2, line({ recipe_name: "Margherita", size: "15_INCH", ingredient_name: "Dough" })),
      at(3, line({ recipe_name: "Margherita", size: "11_INCH", ingredient_name: "Dough" })),
    ];
    const p = previewRecipes("upsert", rows, [recipe({ recipe_name: "Margherita", size_code: "15_INCH" })], [], false);
    expect(p.counts).toMatchObject({ update: 1, new: 1 });
    expect(p.rows[0].label).toContain("(15-inch)");
    expect(p.rows[1].label).toContain("(11-inch)");
  });

  it("warns that unknown ingredients will be created without a price", () => {
    const p = previewRecipes("upsert", [at(2, line({ ingredient_name: "Mystery Herb" }))], [], [], true);
    expect(p.warnings[0]).toMatch(/WITHOUT a price: Mystery Herb/);
  });
});

describe("groupRecipeLines", () => {
  it("groups by name case-insensitively, in file order, 15-inch before 11-inch", () => {
    const l = (name: string, size: ImportRecipeLine["size"], ing: string): ImportRecipeLine => ({
      recipe_name: name, category: "Pizza", size, ingredient_name: ing, quantity: 1,
      unit: "Gram", selling_price: null, packaging_cost: null,
    });
    const groups = groupRecipeLines([
      l("Margherita", "11_INCH", "Dough"),
      l("margherita", "15_INCH", "Dough"),
      l("Katsu Curry", null, "Chicken"),
    ]);
    expect(groups.map((g) => g.name)).toEqual(["Margherita", "Katsu Curry"]);
    expect(groups[0].variants.map((v) => v.sizeCode)).toEqual(["15_INCH", "11_INCH"]);
    expect(groups[1].variants).toHaveLength(1);
    expect(groups[1].variants[0].sizeCode).toBeNull();
  });
});
