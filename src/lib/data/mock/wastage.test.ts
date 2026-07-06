import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./db";
import { wastageRepo } from "./wastage";
import { materialsRepo } from "./materials";

const ACTOR = "u-admin";

describe("multi-line wastage", () => {
  beforeEach(() => resetDb());

  it("sums line costs + packaging into total_cost and stores itemised lines", async () => {
    const mats = await materialsRepo.list();
    const [m1, m2] = mats;
    const entry = await wastageRepo.create(
      {
        name: "Evening spoilage",
        wastage_date: "2026-06-01",
        brand: "capiche",
        outlet_id: "o-capiche-1",
        category: "Kitchen",
        wastage_type: "Spoilage",
        reason: "spoiled",
        department: "Kitchen Staff",
        done_by: "Tester",
        packaging_cost: 10,
        lines: [
          { item_type: "ingredient", ingredient_id: m1.id, recipe_id: null, quantity: 2, unit: "Gram", unit_cost: 5 },
          { item_type: "ingredient", ingredient_id: m2.id, recipe_id: null, quantity: 1, unit: "Gram", unit_cost: 3 },
        ],
      },
      ACTOR,
    );
    // ingredient cost = 2*5 + 1*3 = 13; + packaging 10 = 23
    expect(entry.total_cost).toBe(23);
    expect(entry.name).toBe("Evening spoilage");
    expect(entry.status).toBe("recorded");

    const withLines = await wastageRepo.getWithLines(entry.id);
    expect(withLines?.lines.length).toBe(2);
    expect(withLines?.lines[0].name).toBeTruthy();
    expect(withLines?.lines[0].total_cost).toBe(10);
  });

  it("recomputes the total on update and deletes lines with the record", async () => {
    const m1 = (await materialsRepo.list())[0];
    const base = {
      wastage_date: "2026-06-01",
      brand: "capiche",
      outlet_id: "o-capiche-1",
      wastage_type: "Spoilage" as const,
      reason: "x",
      department: "Kitchen Staff" as const,
      done_by: "T",
    };
    const entry = await wastageRepo.create(
      { ...base, packaging_cost: 0, lines: [{ item_type: "ingredient", ingredient_id: m1.id, recipe_id: null, quantity: 1, unit: "Gram", unit_cost: 4 }] },
      ACTOR,
    );
    expect(entry.total_cost).toBe(4);
    const updated = await wastageRepo.update(
      entry.id,
      { ...base, packaging_cost: 5, lines: [{ item_type: "ingredient", ingredient_id: m1.id, recipe_id: null, quantity: 3, unit: "Gram", unit_cost: 4 }] },
      ACTOR,
    );
    expect(updated.total_cost).toBe(17); // 3*4 + 5
    await wastageRepo.remove(entry.id, ACTOR);
    expect(await wastageRepo.getWithLines(entry.id)).toBeNull();
  });
});
