// A yield record is one PREPARATION of an ingredient, so several preps may share an
// effective date; only the same prep twice on that date is a duplicate.
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { materialsRepo } from "./mock/materials";
import { yieldsRepo } from "./mock/yields";

const ACTOR = "u-admin";
const DATE = "2026-10-11";

async function garlic() {
  return materialsRepo.create(
    { ingredient_name: "Audit Green Garlic", category: "Veg", purchase_price: 200, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
    ACTOR,
  );
}

const input = (ingredient_id: string, name: string, wastage_quantity: number) => ({
  name,
  ingredient_id,
  purchase_cost: 200,
  purchase_quantity: 1,
  purchase_unit: "KG",
  wastage_quantity,
  wastage_unit: "Gram",
  effective_from: DATE,
});

describe("yield records per preparation", () => {
  beforeEach(() => resetDb());

  it("saves two different preps for one ingredient on the same date", async () => {
    const m = await garlic();
    const processed = await yieldsRepo.create(input(m.id, "Processed Green Garlic", 538.5), ACTOR);
    const chopped = await yieldsRepo.create(input(m.id, "Chopped Green Garlic", 259.3), ACTOR);
    expect(processed.yield_percentage).toBeCloseTo(46.15, 1);
    expect(chopped.yield_percentage).toBeCloseTo(74.07, 1);
    expect((await yieldsRepo.listForIngredient(m.id)).length).toBe(2);
  });

  it("rejects the same prep twice on one date, ignoring case and spacing", async () => {
    const m = await garlic();
    await yieldsRepo.create(input(m.id, "Chopped Green Garlic", 259.3), ACTOR);
    await expect(yieldsRepo.create(input(m.id, "  chopped   green garlic ", 300), ACTOR)).rejects.toThrow(
      /already exists for this prep/i,
    );
  });

  it("allows the same prep on a different date (price history)", async () => {
    const m = await garlic();
    await yieldsRepo.create(input(m.id, "Chopped Green Garlic", 259.3), ACTOR);
    const later = await yieldsRepo.create(
      { ...input(m.id, "Chopped Green Garlic", 240), effective_from: "2026-11-01" },
      ACTOR,
    );
    expect(later.effective_from).toBe("2026-11-01");
  });

  it("blocks an update that would collide with another prep on the same date", async () => {
    const m = await garlic();
    await yieldsRepo.create(input(m.id, "Processed Green Garlic", 538.5), ACTOR);
    const chopped = await yieldsRepo.create(input(m.id, "Chopped Green Garlic", 259.3), ACTOR);
    await expect(
      yieldsRepo.update(chopped.id, input(m.id, "Processed Green Garlic", 259.3), ACTOR),
    ).rejects.toThrow(/already exists for this prep/i);
    // Editing the record itself (same name) still works.
    const saved = await yieldsRepo.update(chopped.id, input(m.id, "Chopped Green Garlic", 250), ACTOR);
    expect(saved.usable_quantity).toBe(750);
  });

  it("stores a boiled prep that gains weight (usable > raw, yield > 100%)", async () => {
    const pasta = await materialsRepo.create(
      { ingredient_name: "Audit Linguini", category: "Pasta", purchase_price: 300, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    const row = await yieldsRepo.create(input(pasta.id, "Boiled Linguini", -950), ACTOR);
    expect(row.usable_quantity).toBe(1950);
    expect(row.yield_percentage).toBe(195);
    expect(row.yield_adjusted_unit_cost).toBeCloseTo(200 / 1950, 6);
  });
});
