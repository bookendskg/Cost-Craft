import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./db";
import { brandsRepo } from "./brands";
import { outletsRepo } from "./outlets";

describe("brands & outlets repo", () => {
  beforeEach(() => resetDb());

  it("seeds the two known brands and six outlets", async () => {
    expect((await brandsRepo.list()).length).toBe(2);
    expect((await outletsRepo.list()).length).toBe(6);
  });

  it("creates a brand and rejects duplicate name / code", async () => {
    const b = await brandsRepo.create({ name: "Nomad", brand_code: "NOM" }, "u-moin");
    expect(b.id).toBeTruthy();
    expect((await brandsRepo.list()).length).toBe(3);
    await expect(brandsRepo.create({ name: "nomad", brand_code: "X" }, "u-moin")).rejects.toThrow(/name already exists/i);
    await expect(brandsRepo.create({ name: "Other", brand_code: "NOM" }, "u-moin")).rejects.toThrow(/code already exists/i);
  });

  it("creates an outlet under a brand, dedupes per brand, and validates the brand", async () => {
    const o = await outletsRepo.create(
      { brand_id: "capiche", name: "Capiche Adajan", outlet_code: "CAP-ADA" },
      "u-moin",
    );
    expect(o.brand_id).toBe("capiche");
    await expect(
      outletsRepo.create({ brand_id: "capiche", name: "capiche adajan", outlet_code: "X" }, "u-moin"),
    ).rejects.toThrow(/already exists for this brand/i);
    await expect(
      outletsRepo.create({ brand_id: "nope", name: "Z", outlet_code: "Z" }, "u-moin"),
    ).rejects.toThrow(/valid brand/i);
  });

  it("archives an outlet via setStatus", async () => {
    await outletsRepo.setStatus("capiche-piplod", "archived", "u-moin");
    expect((await outletsRepo.getById("capiche-piplod"))!.status).toBe("archived");
  });

  it("blocks deleting a brand that still has outlets/recipes; deletes a fresh one", async () => {
    await expect(brandsRepo.remove("capiche", "u-moin")).rejects.toThrow(/outlets|recipes/i);
    const b = await brandsRepo.create({ name: "Temp", brand_code: "TMP" }, "u-moin");
    await brandsRepo.remove(b.id, "u-moin");
    expect(await brandsRepo.getById(b.id)).toBeNull();
  });

  it("deletes a fresh outlet with no wastage", async () => {
    const o = await outletsRepo.create({ brand_id: "aiko", name: "Aiko Temp", outlet_code: "AIKO-TMP" }, "u-moin");
    await outletsRepo.remove(o.id, "u-moin");
    expect(await outletsRepo.getById(o.id)).toBeNull();
  });
});
