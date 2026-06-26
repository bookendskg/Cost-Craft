import { describe, it, expect } from "vitest";
import { computeYield, toBaseQuantity, perKilo } from "./yield";

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
