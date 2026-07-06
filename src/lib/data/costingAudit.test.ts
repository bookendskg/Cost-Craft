import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { materialsRepo } from "./mock/materials";
import { recipesRepo } from "./mock/recipes";
import { yieldsRepo } from "./mock/yields";
import { sheetFigures } from "./packagingData";
import { calculateCostPerBaseUnit } from "../costing";

// VERIFICATION ONLY — asserts the existing costing chain is correct end to end.
// No pricing formula is changed here; this is the audit proof.

const ACTOR = "u-admin";

describe("costing audit", () => {
  beforeEach(() => resetDb());

  it("raw material: price ÷ (qty × conversion) = cost per base unit", async () => {
    const m = await materialsRepo.create(
      { ingredient_name: "Audit Onion", category: "Veg", purchase_price: 100, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    expect(m.cost_per_base_unit).toBeCloseTo(0.1, 6); // ₹100 / 1000 g
    expect(calculateCostPerBaseUnit(240, 1, "Litre", "ML")).toBeCloseTo(0.24, 6);
  });

  it("sub-recipe: a raw-material price change flows leaf → prep → parent (latest cost, no stale)", async () => {
    // Chili Crunch Sauce (parent prep) is costed from Chilli Crisp (child prep),
    // which is mostly dried red chilli. Raising the leaf must roll up through both.
    const chilli = (await materialsRepo.getById("m-dried-red-chilli"))!;
    const crispBefore = (await recipesRepo.getById("r-prep-chilli-crisp"))!.total_cost!;
    const sauceBefore = (await recipesRepo.getById("r-prep-chili-crunch-sauce"))!.total_cost!;
    await materialsRepo.update(
      "m-dried-red-chilli",
      { ingredient_name: chilli.ingredient_name, category: chilli.category, purchase_price: (chilli.purchase_price ?? 0) + 500, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    const crispAfter = (await recipesRepo.getById("r-prep-chilli-crisp"))!.total_cost!;
    const sauceAfter = (await recipesRepo.getById("r-prep-chili-crunch-sauce"))!.total_cost!;
    expect(crispAfter).toBeGreaterThan(crispBefore); // child prep recomputed
    expect(sauceAfter).toBeGreaterThan(sauceBefore); // parent used the LATEST sub-recipe cost
  });

  it("yield: adding a wastage yield for an ingredient recomputes recipes that use it", async () => {
    const doughBefore = (await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost!;
    // A 30% wastage yield on olive oil raises its effective ₹/g, so the dough costs more.
    await yieldsRepo.create(
      { ingredient_id: "m-olive-oil", purchase_cost: 900, purchase_quantity: 1, purchase_unit: "KG", wastage_quantity: 300, wastage_unit: "Gram" },
      ACTOR,
    );
    const doughAfter = (await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost!;
    expect(doughAfter).toBeGreaterThan(doughBefore);
  });

  it("pizza: 11-inch and 15-inch cost independently (computed, not hardcoded) + sheet packaging", async () => {
    const recs = await recipesRepo.list();
    const p15 = recs.find((r) => r.recipe_name === "Margherita Pizza" && r.size_code === "15_INCH")!;
    const p11 = recs.find((r) => r.recipe_name === "Margherita Pizza" && r.size_code === "11_INCH")!;
    expect(p15.cost_per_portion ?? 0).toBeGreaterThan(0);
    expect(p11.cost_per_portion ?? 0).toBeGreaterThan(0);
    // 15-inch uses more of every ingredient, so it must cost more than the 11-inch.
    expect(p15.cost_per_portion ?? 0).toBeGreaterThan(p11.cost_per_portion ?? 0);
    // Packaging + selling come from the sheet, per size.
    expect(p15.packaging_cost).toBe(sheetFigures("Margherita Pizza", "15_INCH")!.pkg);
    expect(p11.packaging_cost).toBe(sheetFigures("Margherita Pizza", "11_INCH")!.pkg);
    expect(p15.selling_price).toBe(sheetFigures("Margherita Pizza", "15_INCH")!.selling);
    expect(p11.selling_price).toBe(sheetFigures("Margherita Pizza", "11_INCH")!.selling);
  });

  it("selling price never affects total cost (only food cost %)", async () => {
    const pizza = (await recipesRepo.list()).find((r) => r.recipe_name === "Margherita Pizza" && r.size_code === "15_INCH")!;
    const costBefore = pizza.total_cost;
    await recipesRepo.setSellingPrice(pizza.id, 5000, ACTOR);
    const after = (await recipesRepo.getById(pizza.id))!;
    expect(after.total_cost).toBe(costBefore); // cost unchanged
    expect(after.selling_price).toBe(5000);
  });
});
