import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { materialsRepo } from "./mock/materials";
import { recipesRepo } from "./mock/recipes";

// Validates the price cascade (PRD §4.5): updating an ingredient price
// recalculates every recipe that uses it and records cost history. Uses the
// in-house Pizza Dough prep (which contains 221 g olive oil) as a stable fixture.
describe("price cascade", () => {
  beforeEach(() => {
    resetDb();
  });

  it("seed Pizza Dough prep has a positive cost", async () => {
    const r = await recipesRepo.getById("r-prep-pizza-dough");
    expect(r).toBeTruthy();
    expect(r!.total_cost!).toBeGreaterThan(0);
  });

  it("raising Olive Oil price cascades to recipes that use it", async () => {
    const before = (await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost!;
    const oil = await materialsRepo.getById("m-olive-oil");
    const origPrice = oil!.purchase_price!;
    const newPrice = origPrice + 1000;

    // +₹1000/KG = +₹1/g; Pizza Dough uses 221 g olive oil ⇒ +₹221 raw, +5% wastage.
    await materialsRepo.update(
      "m-olive-oil",
      {
        ingredient_name: oil!.ingredient_name,
        category: oil!.category,
        supplier_name: oil!.supplier_name,
        purchase_price: newPrice,
        purchase_quantity: 1,
        purchase_unit: "KG",
        base_unit: "Gram",
      },
      "u-admin",
    );

    const after = (await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost!;
    // +₹221 raw, then +5% wastage ⇒ ≈ ₹232 increase in the prep total.
    expect(after - before).toBeGreaterThan(225);
    expect(after - before).toBeLessThan(240);

    const history = await recipesRepo.costHistory("r-prep-pizza-dough");
    expect(history.length).toBe(1);
    expect(history[0].old_total_cost).toBe(before);
    expect(history[0].new_total_cost).toBe(after);

    const priceLog = await materialsRepo.priceHistory("m-olive-oil");
    expect(priceLog[0].old_price).toBe(origPrice);
    expect(priceLog[0].new_price).toBe(newPrice);
  });
});
