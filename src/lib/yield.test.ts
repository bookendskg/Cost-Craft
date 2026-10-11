import { describe, it, expect } from "vitest";
import { computeYield, toBaseQuantity, perKilo, effectiveCostPerBaseUnit, activeYield } from "./yield";
import type { IngredientYield } from "./data/types";

const onionYield = {
  ingredient_id: "m-onion",
  raw_quantity: 1000,
  wastage_percentage: 20,
  usable_quantity: 800,
  purchase_cost: 150,
  yield_adjusted_unit_cost: 0.1875,
  effective_from: "2026-06-01",
} as IngredientYield;

describe("yield engine — toBaseQuantity", () => {
  it("converts purchase units to the base unit", () => {
    expect(toBaseQuantity(1, "KG")).toBe(1000);
    expect(toBaseQuantity(5, "KG")).toBe(5000);
    expect(toBaseQuantity(2, "Litre")).toBe(2000);
    expect(toBaseQuantity(250, "Gram")).toBe(250);
  });
});

describe("yield engine — PRD §21 Test 1 (Onion)", () => {
  // 1 kg @ ₹100, 200 g wastage → 800 g usable, full ₹100 over 800 g.
  const r = computeYield({ purchaseCost: 100, purchaseQuantity: 1, purchaseUnit: "KG", wastageQty: 200 });
  it("raw / usable quantities", () => {
    expect(r.rawQtyBase).toBe(1000);
    expect(r.usableQty).toBe(800);
  });
  it("wastage % = 20, yield % = 80", () => {
    expect(r.wastagePct).toBe(20);
    expect(r.yieldPct).toBe(80);
  });
  it("original ₹0.10/g, effective ₹0.125/g, ₹125/kg (NOT ₹80 for 800 g)", () => {
    expect(r.originalUnitCost).toBeCloseTo(0.1, 6);
    expect(r.yieldAdjustedUnitCost).toBeCloseTo(0.125, 6);
    expect(r.yieldAdjustedCostPerKg).toBe(125);
    // sanity: full purchase cost is preserved across the usable quantity
    expect(r.yieldAdjustedUnitCost * r.usableQty).toBeCloseTo(100, 6);
  });
});

describe("yield engine — PRD §21 Test 2 (Tomato)", () => {
  // 5 kg @ ₹500, 500 g wastage → 4500 g usable.
  const r = computeYield({ purchaseCost: 500, purchaseQuantity: 5, purchaseUnit: "KG", wastageQty: 500 });
  it("raw 5000 g, usable 4500 g, yield 90%", () => {
    expect(r.rawQtyBase).toBe(5000);
    expect(r.usableQty).toBe(4500);
    expect(r.yieldPct).toBe(90);
  });
  it("effective ≈ ₹111.11/kg", () => {
    expect(perKilo(r.yieldAdjustedUnitCost)).toBeCloseTo(111.11, 2);
  });
});

describe("yield engine — recipe usage (PRD §21 Recipe Test)", () => {
  it("200 g of onion at the ₹0.125/g effective rate = ₹25 (not ₹20)", () => {
    const r = computeYield({ purchaseCost: 100, purchaseQuantity: 1, purchaseUnit: "KG", wastageQty: 200 });
    const recipeCost = 200 * r.yieldAdjustedUnitCost;
    expect(recipeCost).toBeCloseTo(25, 6);
  });
});

describe("effectiveCostPerBaseUnit (§9 cost-selection rule)", () => {
  it("no yield → standard purchase rate", () => {
    expect(effectiveCostPerBaseUnit(0.15, null)).toBe(0.15);
  });
  it("yield present → adjusted rate (full cost over usable, ₹150/800g)", () => {
    expect(effectiveCostPerBaseUnit(0.15, onionYield)).toBeCloseTo(0.1875, 6);
  });
  it("recipe-specific wastage override recomputes the rate (§10)", () => {
    // 10% wastage → usable 900 g → 150/900
    expect(effectiveCostPerBaseUnit(0.15, onionYield, 10)).toBeCloseTo(150 / 900, 6);
  });
  it("no price and no yield → null", () => {
    expect(effectiveCostPerBaseUnit(null, null)).toBeNull();
  });
  it("recipe uses 200 g onion at the yield rate", () => {
    const rate = effectiveCostPerBaseUnit(0.15, onionYield)!;
    expect(200 * rate).toBeCloseTo(37.5, 6); // 200 × 0.1875
  });
});

describe("activeYield — standard record only", () => {
  const onion = { id: "m-onion", ingredient_name: "Onion" };
  const std = (over: Partial<IngredientYield>) =>
    ({ ...onionYield, name: "Onion Yield", created_at: "2026-01-01T00:00:00Z", ...over }) as IngredientYield;
  const a = std({ id: "a", effective_from: "2026-01-01" });
  const b = std({ id: "b", effective_from: "2026-06-01" });

  it("returns the latest record effective on/before the date", () => {
    expect(activeYield([a, b], onion, "2026-07-01")?.id).toBe("b");
    expect(activeYield([a, b], onion, "2026-03-01")?.id).toBe("a");
  });
  it("returns null when none are yet effective", () => {
    expect(activeYield([a, b], onion, "2025-12-01")).toBeNull();
  });
  it("ignores named preps — they apply only to a line that selects that prep", () => {
    const chopped = std({ id: "c", name: "Chopped Onion", effective_from: "2026-07-01" });
    expect(activeYield([a, chopped], onion, "2026-08-01")?.id).toBe("a");
    expect(activeYield([chopped], onion, "2026-08-01")).toBeNull();
  });
  it("treats a blank name or the bare ingredient name as the standard record", () => {
    expect(activeYield([std({ id: "d", name: null })], onion, "2026-07-01")?.id).toBe("d");
    expect(activeYield([std({ id: "e", name: "Onion" })], onion, "2026-07-01")?.id).toBe("e");
  });
  it("breaks a same-date tie with the most recently created row", () => {
    const older = std({ id: "old", created_at: "2026-06-01T09:00:00Z" });
    const newer = std({ id: "new", created_at: "2026-06-01T18:00:00Z" });
    expect(activeYield([older, newer], onion, "2026-07-01")?.id).toBe("new");
  });
});

describe("cooking weight gain — yield above 100% (boiled preps)", () => {
  it("Boiled Arborio Rice: 1000 g raw, -400 g wastage → 1400 g usable, 140% yield", () => {
    const r = computeYield({ purchaseCost: 100, purchaseQuantity: 1, purchaseUnit: "KG", wastageQty: -400 });
    expect(r.rawQtyBase).toBe(1000);
    expect(r.usableQty).toBe(1400);
    expect(r.yieldPct).toBe(140);
    expect(r.wastagePct).toBe(-40);
    // ₹P per raw kg → ₹P ÷ 1.4 per cooked kg.
    expect(r.yieldAdjustedCostPerKg).toBeCloseTo(100 / 1.4, 2);
    expect(r.yieldAdjustedUnitCost * r.usableQty).toBeCloseTo(100, 6);
  });

  it("matches the Costing Master yields for all nine boiled preps", () => {
    const boiled: [string, number, number][] = [
      ["Boiled Spaghetti", 1850, 185],
      ["Boiled Macaroni", 1610, 161],
      ["Boiled Bucatini", 1810, 181],
      ["Boiled Fettuccini", 1850, 185],
      ["Boiled Linguini", 1950, 195],
      ["Boiled Conchiglioni", 1800, 180],
      ["Boiled Rigatoni", 1800, 180],
      ["Boiled Penne", 1750, 175],
      ["Boiled Arborio Rice", 1400, 140],
    ];
    for (const [name, usable, yieldPct] of boiled) {
      const r = computeYield({ purchaseCost: 200, purchaseQuantity: 1, purchaseUnit: "KG", wastageQty: 1000 - usable });
      expect(r.usableQty, name).toBe(usable);
      expect(r.yieldPct, name).toBe(yieldPct);
    }
  });

  it("a weight-gain yield makes the recipe rate CHEAPER per usable gram", () => {
    const boiledPasta = {
      ingredient_id: "m-pasta", raw_quantity: 1000, wastage_percentage: -95,
      usable_quantity: 1950, purchase_cost: 200, yield_adjusted_unit_cost: 200 / 1950,
      effective_from: "2026-06-01",
    } as IngredientYield;
    const rate = effectiveCostPerBaseUnit(0.2, boiledPasta)!;
    expect(rate).toBeCloseTo(200 / 1950, 6);
    expect(rate).toBeLessThan(0.2);
  });
});
