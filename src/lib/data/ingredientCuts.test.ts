import { describe, it, expect } from "vitest";
import type { IngredientYield } from "./types";
import { cutOptionsFor, cutYieldFor, yieldRecordCutLabel } from "./ingredientCuts";

const onion = { id: "onion-1", ingredient_name: "Onion" };
const rec = (over: Partial<IngredientYield>): IngredientYield => ({
  id: "y1", name: null, ingredient_id: onion.id, purchase_cost: 100, purchase_quantity: 1, purchase_unit: "KG",
  raw_quantity: 1000, raw_unit: "Gram", wastage_quantity: 0, wastage_unit: "Gram", usable_quantity: 1000,
  wastage_percentage: 0, yield_percentage: 100, original_unit_cost: 0.1, yield_adjusted_unit_cost: 0.1,
  effective_from: "2026-01-01", notes: null, created_at: "2026-01-01T00:00:00Z", updated_at: "", created_by: null,
  ...over,
});

describe("yieldRecordCutLabel", () => {
  it("strips the ingredient name from the record name", () => {
    expect(yieldRecordCutLabel("Chopped Onion", "Onion")).toBe("Chopped");
    expect(yieldRecordCutLabel("onion - fine dice", "Onion")).toBe("Fine Dice");
    expect(yieldRecordCutLabel(null, "Onion")).toBe("Standard yield");
    expect(yieldRecordCutLabel("Onion Yield", "Onion")).toBe("Standard yield");
    expect(yieldRecordCutLabel("Brunoise", "Onion")).toBe("Brunoise");
  });
});

describe("cutOptionsFor", () => {
  it("adds a Yield Management record as a new cut", () => {
    const opts = cutOptionsFor(onion, [rec({ name: "Chopped Onion", yield_percentage: 66.67 })]);
    expect(opts.map((o) => o.cut)).toEqual(["Sliced", "Diced", "Rings", "Slit", "Chopped"]);
    expect(cutYieldFor(onion, "Chopped", [rec({ name: "Chopped Onion", yield_percentage: 66.67 })])).toBe(66.67);
  });

  it("lets a record override a built-in cut and the latest record win", () => {
    const yields = [
      rec({ id: "a", name: "Diced Onion", yield_percentage: 45, effective_from: "2026-02-01" }),
      rec({ id: "b", name: "Diced Onion", yield_percentage: 48, effective_from: "2026-03-01" }),
    ];
    expect(cutYieldFor(onion, "Diced", yields)).toBe(48);
    expect(cutOptionsFor(onion, yields)).toHaveLength(4);
  });

  it("ignores future-dated records and other ingredients", () => {
    const yields = [
      rec({ name: "Chopped Onion", effective_from: "2999-01-01" }),
      rec({ name: "Chopped Garlic", ingredient_id: "garlic" }),
    ];
    expect(cutOptionsFor(onion, yields).map((o) => o.cut)).toEqual(["Sliced", "Diced", "Rings", "Slit"]);
  });

  it("gives non-vegetable ingredients options from their records only", () => {
    const mango = { id: "m", ingredient_name: "Alphonso Mango" };
    expect(cutOptionsFor(mango, [rec({ ingredient_id: "m", name: "Processed Alphonso Mango", yield_percentage: 70.37 })]))
      .toEqual([{ cut: "Processed", yieldPct: 70.37 }]);
  });
});
