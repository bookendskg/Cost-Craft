import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { packagingRepo } from "./mock/packaging";
import { recipesRepo } from "./mock/recipes";
import { RECIPE_PACKAGING_BY_NAME, normDishName } from "./packagingData";

// Verifies the packaging data extracted from the Bookends costing sheet is wired
// into the seed: the master items and each recipe's packaging cost + weight.

describe("packaging data from the Bookends sheet", () => {
  beforeEach(() => resetDb());

  it("seeds the real packaging master with prices", async () => {
    const items = await packagingRepo.list();
    expect(items.length).toBeGreaterThanOrEqual(20);
    const bag = items.find((p) => /takeaway bag/i.test(p.name));
    expect(bag?.unit_price).toBeGreaterThan(0);
  });

  it("sets matched recipes' packaging cost + weight from the sheet", async () => {
    const recipes = await recipesRepo.list();
    let matched = 0;
    for (const r of recipes) {
      const sheet = RECIPE_PACKAGING_BY_NAME[normDishName(r.recipe_name)];
      if (sheet && !r.is_prep) {
        matched++;
        expect(r.packaging_cost).toBe(sheet.pkg);
        if (sheet.weightG != null) expect(r.total_weight_g).toBe(sheet.weightG);
      }
    }
    expect(matched).toBeGreaterThan(10);
  });
});
