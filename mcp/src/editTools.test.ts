// The ingredient and yield EDIT tools. Both underlying repos replace the whole
// record, so the risk is a tool quietly wiping whatever the caller didn't mention —
// and a rename silently orphaning the cut/prep label that recipe lines cost from.
// These tests drive the tools exactly as an assistant would.
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/lib/data/mock/db";
import { materialsRepo } from "@/lib/data/mock/materials";
import { yieldsRepo } from "@/lib/data/mock/yields";
import { recipesRepo } from "@/lib/data/mock/recipes";
import { TOOLS } from "./tools";
import { setActor } from "./toolkit";

const tool = (name: string) => {
  const found = TOOLS.find((t) => t.name === name);
  if (!found) throw new Error(`No tool named ${name}`);
  return found;
};

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await tool(name).handler(args as never);
  const text = result.content[0]?.text ?? "";
  return {
    isError: !!result.isError,
    text,
    data: (() => {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    })(),
  };
}

const asAdmin = () =>
  setActor({ userId: "u-admin", email: "admin@example.com", name: "Admin", role: "admin" });

const material = async (name: string) =>
  (await materialsRepo.list()).find((m) => m.ingredient_name === name)!;

describe("update_ingredient", () => {
  beforeEach(() => {
    resetDb();
    asAdmin();
  });

  it("renames without touching anything else", async () => {
    const before = await material("Onion");
    const res = await call("update_ingredient", { ingredient: "Onion", name: "White Onion" });
    expect(res.isError).toBe(false);

    const after = (await materialsRepo.list()).find((m) => m.id === before.id)!;
    expect(after.ingredient_name).toBe("White Onion");
    expect(after.category).toBe(before.category);
    expect(after.purchase_price).toBe(before.purchase_price);
    expect(after.purchase_unit).toBe(before.purchase_unit);
    expect((res.data.was as { name: string }).name).toBe("Onion");
  });

  it("changes only the fields given, and keeps the price when renaming", async () => {
    const before = await material("Tomato");
    await call("update_ingredient", { ingredient: "Tomato", category: "Vegetables & Fruits", price: 55 });
    const after = (await materialsRepo.list()).find((m) => m.id === before.id)!;
    expect(after.category).toBe("Vegetables & Fruits");
    expect(after.purchase_price).toBe(55);
    expect(after.ingredient_name).toBe("Tomato");
  });

  it("warns when a rename orphans a recipe line's cut", async () => {
    const onion = await material("Onion");
    await call("create_yield", {
      ingredient: "Onion",
      name: "Chopped Onion",
      purchase_cost: 40,
      wastage_quantity: 150,
    });
    const created = await call("create_recipe", {
      name: "Cut Test",
      category: "Mains",
      brand: "capiche",
      ingredients: [{ ingredient: "Onion", quantity: 200, unit: "Gram" }],
    });
    expect(created.isError).toBe(false);
    // Put the line on the "Chopped" cut, the way the recipe editor would.
    const recipe = (await recipesRepo.list()).find((r) => r.recipe_name === "Cut Test")!;
    const full = (await recipesRepo.getWithIngredients(recipe.id))!;
    await recipesRepo.update(
      recipe.id,
      { ...recipe },
      full.ingredients.map((line) => ({
        ingredient_id: line.ingredient_id,
        component_type: line.component_type,
        quantity_used: line.quantity_used,
        unit_used: line.unit_used,
        cut_type: "Chopped",
      })),
      "u-admin",
    );

    const res = await call("update_ingredient", { ingredient: onion.ingredient_name, name: "Red Onion" });
    expect(res.isError).toBe(false);
    expect(res.data.warning).toMatch(/cut\/prep/i);
    // The yield-derived cut breaks, and so do the built-in cuts other recipes picked —
    // every label is derived from the ingredient's name.
    const affected = res.data.cut_labels_affected as { recipe: string; cut: string }[];
    expect(affected).toContainEqual({ recipe: "Cut Test", cut: "Chopped" });
    expect(res.data.warning).toMatch(new RegExp(`^${affected.length} recipe`));
  });

  it("refuses an ambiguous name rather than renaming the wrong thing", async () => {
    const res = await call("update_ingredient", { ingredient: "Onio", name: "Something" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/matches \d+ ingredients/i);
    expect(res.text).toMatch(/use the exact name/i);
    // …and the exact name still resolves, despite the partial being ambiguous.
    expect((await call("update_ingredient", { ingredient: "Onion", category: "Veg" })).isError).toBe(false);
  });

  it("surfaces a duplicate name instead of creating one", async () => {
    const res = await call("update_ingredient", { ingredient: "Onion", name: "Tomato" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/already exists/i);
  });

  it("asks for something to change", async () => {
    const res = await call("update_ingredient", { ingredient: "Onion" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/nothing to change/i);
  });

  it("refuses a role the database wouldn't let write anyway", async () => {
    setActor({ userId: "u-chef", email: "chef@example.com", name: "Chef", role: "head_chef" });
    const res = await call("update_ingredient", { ingredient: "Onion", price: 10 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/can't edit raw materials/i);
  });
});

describe("update_yield", () => {
  beforeEach(async () => {
    resetDb();
    asAdmin();
    await call("create_yield", {
      ingredient: "Onion",
      name: "Chopped Onion",
      purchase_cost: 40,
      wastage_quantity: 150,
      effective_from: "2026-01-01",
    });
  });

  it("corrects the wastage and keeps the rest of the record", async () => {
    const onion = await material("Onion");
    const found = (await yieldsRepo.listForIngredient(onion.id)).find((y) => y.name === "Chopped Onion")!;
    const before = { ...found };
    const res = await call("update_yield", {
      ingredient: "Onion",
      yield_record: "Chopped Onion",
      wastage_quantity: 200,
    });
    expect(res.isError).toBe(false);

    const after = (await yieldsRepo.getById(before.id))!;
    expect(after.wastage_quantity).toBe(200);
    expect(after.name).toBe("Chopped Onion");
    expect(after.purchase_cost).toBe(before.purchase_cost);
    expect(after.effective_from).toBe("2026-01-01");
    expect(after.yield_percentage).toBeLessThan(before.yield_percentage);
  });

  it("renames a record", async () => {
    const res = await call("update_yield", {
      ingredient: "Onion",
      yield_record: "Chopped Onion",
      name: "Diced Onion",
    });
    expect(res.isError).toBe(false);
    const onion = await material("Onion");
    expect((await yieldsRepo.listForIngredient(onion.id)).some((y) => y.name === "Diced Onion")).toBe(true);
  });

  it("says which record it needs when the ingredient has several", async () => {
    await call("create_yield", {
      ingredient: "Onion",
      name: "Sliced Onion",
      purchase_cost: 40,
      wastage_quantity: 100,
      effective_from: "2026-02-01",
    });
    const res = await call("update_yield", { ingredient: "Onion", wastage_quantity: 120 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/Sliced Onion/);
    expect(res.text).toMatch(/say which one/i);
  });

  it("names the record it couldn't find", async () => {
    const res = await call("update_yield", { ingredient: "Onion", yield_record: "Pickled", name: "x" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/Pickled/);
  });

  it("lets a head chef manage yields, unlike raw materials", async () => {
    setActor({ userId: "u-chef", email: "chef@example.com", name: "Chef", role: "head_chef" });
    const res = await call("update_yield", {
      ingredient: "Onion",
      yield_record: "Chopped Onion",
      purchase_cost: 45,
    });
    expect(res.isError).toBe(false);
  });

  it("refuses a read-only role", async () => {
    setActor({ userId: "u-viewer", email: "v@example.com", name: "Viewer", role: "viewer" });
    const res = await call("update_yield", { ingredient: "Onion", yield_record: "Chopped Onion", purchase_cost: 45 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/can't manage yields/i);
  });
});
