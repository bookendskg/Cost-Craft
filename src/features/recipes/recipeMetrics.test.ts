import { describe, it, expect } from "vitest";
import {
  fullCostPerPortion,
  menuPriceOf,
  foodCostPctOf,
  profitMarginOf,
} from "./recipeMetrics";
import type { Recipe } from "@/lib/data/types";

// Only cost_per_portion / packaging_cost / selling_price are read by the metrics.
const rec = (p: Partial<Recipe>): Recipe => p as Recipe;

describe("recipe metrics — packaging cost", () => {
  it("packaging of 0 leaves all metrics on food cost only", () => {
    const r = rec({ cost_per_portion: 50, packaging_cost: 0, selling_price: null });
    expect(fullCostPerPortion(r)).toBe(50);
    expect(menuPriceOf(r, 30)).toBeCloseTo(166.67, 2); // 50 / 0.30
  });

  it("packaging adds to the full per-portion cost and suggested price", () => {
    const r = rec({ cost_per_portion: 50, packaging_cost: 10, selling_price: null });
    expect(fullCostPerPortion(r)).toBe(60);
    expect(menuPriceOf(r, 30)).toBeCloseTo(200, 2); // 60 / 0.30
  });

  it("FC% and profit use full cost vs the menu price", () => {
    const r = rec({ cost_per_portion: 50, packaging_cost: 10, selling_price: 200 });
    expect(foodCostPctOf(r, 30)).toBe(30); // 60 / 200
    expect(profitMarginOf(r, 30)).toBe(140); // 200 − 60
  });

  it("tolerates a missing packaging_cost (legacy rows)", () => {
    const r = rec({ cost_per_portion: 40, selling_price: null });
    expect(fullCostPerPortion(r)).toBe(40);
  });
});
