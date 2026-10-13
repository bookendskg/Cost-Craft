// Revert (0036) — a Super Admin undoing a logged change. Exercised against the
// mock layer, which mirrors the Supabase repos one-for-one.
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, getDb } from "./mock/db";
import { materialsRepo } from "./mock/materials";
import { recipesRepo } from "./mock/recipes";
import { yieldsRepo } from "./mock/yields";
import { auditRepo, settingsRepo } from "./mock/misc";
import { mockRevertRepo as revertRepo } from "./mock/revert";
import type { AuditEntityType, AuditLog } from "./types";

const ACTOR = "u-admin";

async function latest(entityType: AuditEntityType): Promise<AuditLog> {
  const { rows } = await auditRepo.list({ entityType });
  return rows[0];
}

const material = (over: Partial<Parameters<typeof materialsRepo.create>[0]> = {}) => ({
  ingredient_name: "Revert Onion",
  category: "Veg",
  purchase_price: 100,
  purchase_quantity: 1,
  purchase_unit: "KG",
  base_unit: "Gram",
  ...over,
});

describe("revert — edits", () => {
  beforeEach(() => resetDb());

  it("puts the old price back and re-costs the recipes that use it", async () => {
    const oil = (await materialsRepo.list()).find((m) => m.id === "m-olive-oil")!;
    // The mock hands back live objects, so read the values out before mutating.
    const originalPrice = oil.purchase_price!;
    const doughBefore = (await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost!;

    await materialsRepo.update(
      oil.id,
      { ingredient_name: oil.ingredient_name, category: oil.category, purchase_price: originalPrice + 1000, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    expect((await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost).toBeGreaterThan(doughBefore);

    const result = await revertRepo.revert((await latest("ingredient")).id, ACTOR);
    expect(result.ok).toBe(true);
    expect((await materialsRepo.getById(oil.id))!.purchase_price).toBe(originalPrice);
    expect((await recipesRepo.getById("r-prep-pizza-dough"))!.total_cost).toBeCloseTo(doughBefore, 2);
  });

  it("records the revert itself, pointing at the change it undid", async () => {
    const m = await materialsRepo.create(material(), ACTOR);
    await materialsRepo.update(m.id, material({ purchase_price: 250 }), ACTOR);
    const edit = await latest("ingredient");

    await revertRepo.revert(edit.id, ACTOR);
    const log = await latest("ingredient");
    expect(log.action).toBe("revert");
    expect(log.revert_of).toBe(edit.id);
    expect(log.notes).toMatch(/Reverted:/);
    expect(await revertRepo.revertedIds([edit.id])).toEqual([edit.id]);
  });

  it("restores a settings change", async () => {
    await settingsRepo.set("food_cost_pct", "35", ACTOR);
    await revertRepo.revert((await latest("settings")).id, ACTOR);
    expect(await settingsRepo.get("food_cost_pct")).not.toBe("35");
  });
});

describe("revert — creations and deletions", () => {
  beforeEach(() => resetDb());

  it("removes a record that the change created", async () => {
    const m = await materialsRepo.create(material({ ingredient_name: "Revert Kiwi" }), ACTOR);
    const result = await revertRepo.revert((await latest("ingredient")).id, ACTOR);
    expect(result.ok).toBe(true);
    expect(await materialsRepo.getById(m.id)).toBeNull();
  });

  it("restores a deleted ingredient under its ORIGINAL id, with its yields", async () => {
    const m = await materialsRepo.create(material({ ingredient_name: "Revert Carrot" }), ACTOR);
    await yieldsRepo.create(
      { name: "Chopped Revert Carrot", ingredient_id: m.id, purchase_cost: 100, purchase_quantity: 1, purchase_unit: "KG", wastage_quantity: 200, wastage_unit: "Gram" },
      ACTOR,
    );
    await materialsRepo.remove(m.id, ACTOR);
    expect(await materialsRepo.getById(m.id)).toBeNull();

    const result = await revertRepo.revert((await latest("ingredient")).id, ACTOR);
    expect(result.ok).toBe(true);
    const restored = (await materialsRepo.getById(m.id))!;
    expect(restored.id).toBe(m.id); // same id → recipe lines keep resolving
    expect(restored.ingredient_name).toBe("Revert Carrot");
    expect((await yieldsRepo.listForIngredient(m.id)).length).toBe(1);
  });

  it("restores a deleted recipe with its ingredient lines", async () => {
    const recipe = (await recipesRepo.list()).find((r) => !r.is_prep)!;
    const lineCount = (await recipesRepo.getWithIngredients(recipe.id))!.ingredients.length;
    await recipesRepo.remove(recipe.id, ACTOR);
    expect(await recipesRepo.getById(recipe.id)).toBeNull();

    await revertRepo.revert((await latest("recipe")).id, ACTOR);
    const back = await recipesRepo.getWithIngredients(recipe.id);
    expect(back?.recipe.recipe_name).toBe(recipe.recipe_name);
    expect(back?.ingredients.length).toBe(lineCount);
  });
});

describe("revert — conflicts, batches and refusals", () => {
  beforeEach(() => resetDb());

  it("warns when the record changed again, and proceeds when forced", async () => {
    const m = await materialsRepo.create(material({ ingredient_name: "Revert Tomato" }), ACTOR);
    await materialsRepo.update(m.id, material({ ingredient_name: "Revert Tomato", purchase_price: 200 }), ACTOR);
    const firstEdit = await latest("ingredient");
    await materialsRepo.update(m.id, material({ ingredient_name: "Revert Tomato", purchase_price: 300 }), ACTOR);

    const blocked = await revertRepo.revert(firstEdit.id, ACTOR);
    expect(blocked.ok).toBe(false);
    expect(blocked.conflict).toBe(true);
    expect((await materialsRepo.getById(m.id))!.purchase_price).toBe(300);

    const forced = await revertRepo.revert(firstEdit.id, ACTOR, true);
    expect(forced.ok).toBe(true);
    expect((await materialsRepo.getById(m.id))!.purchase_price).toBe(100);
  });

  it("reverts a whole import in one go", async () => {
    const rows = ["Batch Item A", "Batch Item B", "Batch Item C"].map((ingredient_name) => ({
      ingredient_name, category: "Veg", purchase_price: 50, purchase_quantity: 1,
      purchase_unit: "KG", base_unit: "Gram",
    }));
    await materialsRepo.importMaterials("upsert", rows, ACTOR);
    const names = (await materialsRepo.list()).map((m) => m.ingredient_name);
    expect(names).toEqual(expect.arrayContaining(["Batch Item A", "Batch Item B", "Batch Item C"]));

    const batchId = getDb().audit_logs.find((a) => a.batch_id)!.batch_id!;
    const result = await revertRepo.revertBatch(batchId, ACTOR);
    expect(result.ok).toBe(true);
    const after = (await materialsRepo.list()).map((m) => m.ingredient_name);
    for (const n of ["Batch Item A", "Batch Item B", "Batch Item C"]) expect(after).not.toContain(n);
  });

  it("refuses entries that aren't changes", async () => {
    const db = getDb();
    db.audit_logs.push({
      id: "a-session", entity_type: "session", entity_id: "u1", action: "login",
      old_values: null, new_values: null, performed_by: "u1", performed_at: new Date().toISOString(),
      notes: "Signed in",
    } as AuditLog);
    const result = await revertRepo.revert("a-session", ACTOR);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/aren't changes/i);
  });

  it("refuses entries recorded before snapshots existed", async () => {
    const db = getDb();
    db.audit_logs.push({
      id: "a-legacy", entity_type: "ingredient", entity_id: "m-olive-oil", action: "update",
      old_values: { price: 1 }, new_values: { price: 2 }, performed_by: ACTOR,
      performed_at: new Date().toISOString(), notes: "Legacy change",
    } as AuditLog);
    const result = await revertRepo.revert("a-legacy", ACTOR);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/before snapshots existed/i);
  });
});
