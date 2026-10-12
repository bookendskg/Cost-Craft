// The Activity Log is only as good as the rows the repos write. This asserts that
// each mutation leaves a trail with the right entity type, action and actor, and
// that auditRepo.list filters + pages correctly.
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { auditRepo, settingsRepo } from "./mock/misc";
import { materialsRepo } from "./mock/materials";
import { yieldsRepo } from "./mock/yields";
import { packagingRepo } from "./mock/packaging";
import { usersRepo } from "./mock/users";
import type { AuditEntityType, AuditLog } from "./types";

const ACTOR = "u-admin";

/** Newest row for an entity type (the log is sorted newest-first). */
async function latest(entityType: AuditEntityType): Promise<AuditLog | undefined> {
  const { rows } = await auditRepo.list({ entityType });
  return rows[0];
}

describe("audit trail — every mutation is recorded", () => {
  beforeEach(() => resetDb());

  it("ingredient create / update / delete", async () => {
    const m = await materialsRepo.create(
      { ingredient_name: "Trail Onion", category: "Veg", purchase_price: 100, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    let row = await latest("ingredient");
    expect(row).toMatchObject({ action: "create", entity_id: m.id, performed_by: ACTOR });

    await materialsRepo.update(
      m.id,
      { ingredient_name: "Trail Onion", category: "Veg", purchase_price: 150, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    row = await latest("ingredient");
    expect(row?.action).toBe("update");
    expect(row?.old_values).toMatchObject({ price: 100 });
    expect(row?.new_values).toMatchObject({ price: 150 });

    await materialsRepo.remove(m.id, ACTOR);
    expect((await latest("ingredient"))?.action).toBe("delete");
  });

  it("yield records file under their own entity type", async () => {
    const m = await materialsRepo.create(
      { ingredient_name: "Trail Carrot", category: "Veg", purchase_price: 80, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
      ACTOR,
    );
    const y = await yieldsRepo.create(
      { name: "Chopped Trail Carrot", ingredient_id: m.id, purchase_cost: 80, purchase_quantity: 1, purchase_unit: "KG", wastage_quantity: 200, wastage_unit: "Gram" },
      ACTOR,
    );
    const row = await latest("yield");
    expect(row).toMatchObject({ action: "create", performed_by: ACTOR });
    await yieldsRepo.remove(y.id, ACTOR);
    expect((await latest("yield"))?.action).toBe("delete");
  });

  it("packaging create and update", async () => {
    const p = await packagingRepo.create(
      { name: "Trail Box", packaging_type: "primary", unit: "Piece", unit_price: 5 },
      ACTOR,
    );
    expect((await latest("packaging"))?.action).toBe("create");
    await packagingRepo.update(p.id, { name: "Trail Box", packaging_type: "primary", unit: "Piece", unit_price: 7 }, ACTOR);
    expect((await latest("packaging"))?.action).toBe("update");
  });

  it("a user's role change is recorded with before → after", async () => {
    const users = await usersRepo.list();
    // Changing your OWN role is blocked (§28), so pick someone else whose role
    // actually changes.
    const target = users.find((u) => u.id !== ACTOR && !["super_admin", "editor"].includes(u.role))!;
    const previousRole = target.role;
    await usersRepo.update(target.id, { role: "editor" }, ACTOR);
    const row = await latest("user");
    expect(row).toMatchObject({ action: "update", entity_id: target.id, performed_by: ACTOR });
    expect(row?.notes ?? "").toMatch(new RegExp(`Role changed ${previousRole} . editor`));
    expect(row?.new_values).toMatchObject({ role: "editor" });
  });

  it("settings changes are recorded", async () => {
    await settingsRepo.set("food_cost_pct", "35", ACTOR);
    const row = await latest("settings");
    expect(row).toMatchObject({ action: "update", entity_id: "food_cost_pct" });
    expect(row?.new_values).toMatchObject({ food_cost_pct: "35" });
  });
});

describe("auditRepo.list — filters and paging", () => {
  beforeEach(() => resetDb());

  it("filters by action, actor and free text, and pages the results", async () => {
    for (let i = 0; i < 7; i++) {
      await materialsRepo.create(
        { ingredient_name: `Trail Item ${i}`, category: "Veg", purchase_price: 10 + i, purchase_quantity: 1, purchase_unit: "KG", base_unit: "Gram" },
        i % 2 === 0 ? ACTOR : "u-editor",
      );
    }
    const created = await auditRepo.list({ entityType: "ingredient", action: "create" });
    expect(created.rows.length).toBeGreaterThanOrEqual(7);

    const mine = await auditRepo.list({ entityType: "ingredient", action: "create", userId: ACTOR });
    expect(mine.rows.every((r) => r.performed_by === ACTOR)).toBe(true);

    const searched = await auditRepo.list({ search: "Trail Item 3" });
    expect(searched.rows.length).toBe(1);

    const page1 = await auditRepo.list({ entityType: "ingredient", pageSize: 3, page: 1 });
    const page2 = await auditRepo.list({ entityType: "ingredient", pageSize: 3, page: 2 });
    expect(page1.rows).toHaveLength(3);
    expect(page1.total).toBe(page2.total);
    expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
    // Newest first.
    expect(page1.rows[0].performed_at >= page1.rows[1].performed_at).toBe(true);
  });
});
