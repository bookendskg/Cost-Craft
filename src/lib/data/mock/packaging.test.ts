import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./db";
import { packagingRepo } from "./packaging";

const ACTOR = "u-admin";

describe("packaging master repo", () => {
  beforeEach(() => resetDb());

  it("seeds the real packaging master items with prices", async () => {
    const items = await packagingRepo.list();
    expect(items.length).toBeGreaterThanOrEqual(20);
    const bag = items.find((p) => /takeaway bag/i.test(p.name));
    expect(bag).toBeTruthy();
    expect(bag!.unit_price).toBeGreaterThan(0);
  });

  it("creates a packaging item and computes normalized name", async () => {
    const item = await packagingRepo.create(
      { name: "Custom Noodle Box", packaging_type: "primary", unit: "Piece", unit_price: 6 },
      ACTOR,
    );
    expect(item.normalized_name).toBe("custom noodle box");
    expect(item.unit_price).toBe(6);
  });

  it("rejects a duplicate name", async () => {
    const existing = (await packagingRepo.list())[0];
    await expect(
      packagingRepo.create({ name: existing.name, packaging_type: "primary", unit: "Piece", unit_price: 4 }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it("deactivate + update work", async () => {
    const item = (await packagingRepo.list())[0];
    const off = await packagingRepo.setStatus(item.id, "inactive", ACTOR);
    expect(off.status).toBe("inactive");
    const up = await packagingRepo.update(
      item.id,
      { name: item.name, packaging_type: item.packaging_type, unit: item.unit, unit_price: 2 },
      ACTOR,
    );
    expect(up.unit_price).toBe(2);
  });
});
