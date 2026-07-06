import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./db";
import { packagingRepo } from "./packaging";

const ACTOR = "u-admin";

describe("packaging master repo", () => {
  beforeEach(() => resetDb());

  it("seeds the standard packaging items with prices", async () => {
    const items = await packagingRepo.list();
    const box = items.find((p) => p.name === "Pizza Box");
    expect(box).toBeTruthy();
    expect(box!.unit_price).toBe(4.5);
    expect(box!.packaging_type).toBe("primary");
  });

  it("creates a packaging item and computes normalized name", async () => {
    const item = await packagingRepo.create(
      { name: "Noodle Box", packaging_type: "primary", unit: "Piece", unit_price: 6 },
      ACTOR,
    );
    expect(item.normalized_name).toBe("noodle box");
    expect(item.unit_price).toBe(6);
  });

  it("rejects a duplicate name", async () => {
    await expect(
      packagingRepo.create({ name: "Pizza Box", packaging_type: "primary", unit: "Piece", unit_price: 4 }, ACTOR),
    ).rejects.toThrow(/already exists/i);
  });

  it("deactivate + update work", async () => {
    const box = (await packagingRepo.list()).find((p) => p.name === "Sauce Cup")!;
    const off = await packagingRepo.setStatus(box.id, "inactive", ACTOR);
    expect(off.status).toBe("inactive");
    const up = await packagingRepo.update(box.id, { name: "Sauce Cup", packaging_type: "primary", unit: "Piece", unit_price: 2 }, ACTOR);
    expect(up.unit_price).toBe(2);
  });
});
