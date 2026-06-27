import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { materialsRepo } from "./mock/materials";
import { recipesRepo } from "./mock/recipes";

// Validates nested (in-house prep) sub-recipes: a prep recipe references another
// prep as a component, and a leaf material price change rolls up prep → parent.
// Uses the Chili Crunch Sauce prep (which contains the Chilli Crisp prep).
describe("sub-recipe (in-house prep) costing", () => {
  beforeEach(() => {
    resetDb();
  });

  it("Chili Crunch Sauce references another prep as a component", async () => {
    const data = await recipesRepo.getWithIngredients("r-prep-chili-crunch-sauce");
    expect(data).toBeTruthy();
    const crisp = data!.ingredients.find((i) => i.ingredient_id === "r-prep-chilli-crisp");
    expect(crisp?.component_type).toBe("recipe");
    expect(crisp?.subRecipe?.recipe_name).toBe("Chilli Crisp");
    expect(data!.recipe.total_cost!).toBeGreaterThan(0);
  });

  it("prep recipes are flagged is_prep with a positive yield", async () => {
    const dough = await recipesRepo.getById("r-prep-pizza-dough");
    expect(dough?.is_prep).toBe(true);
    expect(dough!.yield_quantity).toBeGreaterThan(0);
  });

  it("recipe total includes the wastage % on top of the raw ingredient cost", async () => {
    const data = await recipesRepo.getWithIngredients("r-prep-pizza-dough");
    const rawSum = data!.ingredients.reduce((s, i) => s + (i.calculated_cost ?? 0), 0);
    expect(data!.recipe.wastage_pct).toBe(5);
    expect(data!.recipe.total_cost!).toBeCloseTo(rawSum * 1.05, 1);
  });

  it("raising a leaf material price rolls up through the prep to the parent", async () => {
    const chilli = await materialsRepo.getById("m-dried-red-chilli");
    const crispBefore = (await recipesRepo.getById("r-prep-chilli-crisp"))!.total_cost!;
    const sauceBefore = (await recipesRepo.getById("r-prep-chili-crunch-sauce"))!.total_cost!;

    // Chilli Crisp is mostly dried red chilli (1 kg); raising it must lift both preps.
    await materialsRepo.update(
      "m-dried-red-chilli",
      {
        ingredient_name: chilli!.ingredient_name,
        category: chilli!.category,
        supplier_name: chilli!.supplier_name,
        purchase_price: chilli!.purchase_price! + 500,
        purchase_quantity: 1,
        purchase_unit: "KG",
        base_unit: "Gram",
      },
      "u-admin",
    );

    const crispAfter = (await recipesRepo.getById("r-prep-chilli-crisp"))!.total_cost!;
    const sauceAfter = (await recipesRepo.getById("r-prep-chili-crunch-sauce"))!.total_cost!;

    expect(crispAfter).toBeGreaterThan(crispBefore);
    expect(sauceAfter).toBeGreaterThan(sauceBefore); // prep → prep roll-up
  });
});
