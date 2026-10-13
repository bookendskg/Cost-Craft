// The catalogue tools write through the app's repos, where a careless call can do
// real damage: recipesRepo.update replaces the whole header AND the whole ingredient
// list, so anything the tool forgets to carry over is silently wiped. These tests
// drive the tools exactly as an assistant would and check what survives.
import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/lib/data/mock/db";
import { recipesRepo } from "@/lib/data/mock/recipes";
import { packagingRepo } from "@/lib/data/mock/packaging";
import { wastageRepo } from "@/lib/data/mock/wastage";
import { TOOLS } from "./tools";
import { setActor } from "./toolkit";

const tool = (name: string) => {
  const found = TOOLS.find((t) => t.name === name);
  if (!found) throw new Error(`No tool named ${name}`);
  return found;
};

/** Call a tool the way the transports do and give back the parsed payload. */
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

describe("catalogue tools — packaging", () => {
  beforeEach(() => {
    resetDb();
    asAdmin();
  });

  it("creates an item and changes only the fields given", async () => {
    const created = await call("create_packaging", { name: "MCP Box", type: "primary", unit: "Piece", unit_price: 12 });
    expect(created.isError).toBe(false);

    const updated = await call("update_packaging", { item: "MCP Box", unit_price: 15 });
    expect(updated.isError).toBe(false);
    const item = (await packagingRepo.list()).find((p) => p.name === "MCP Box")!;
    expect(item.unit_price).toBe(15);
    expect(item.unit).toBe("Piece"); // untouched
    expect(item.packaging_type).toBe("primary");
  });

  it("refuses roles the database wouldn't let write anyway", async () => {
    setActor({ userId: "u-chef", email: "chef@example.com", name: "Chef", role: "head_chef" });
    const res = await call("create_packaging", { name: "Nope", unit_price: 5 });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/can't manage packaging/i);
  });
});

describe("catalogue tools — recipes", () => {
  beforeEach(() => {
    resetDb();
    asAdmin();
  });

  it("creates a recipe with ingredient lines and costs it", async () => {
    const res = await call("create_recipe", {
      name: "MCP Test Dish",
      category: "Mains",
      brand: "capiche",
      serving_size: 2,
      ingredients: [{ ingredient: "Onion", quantity: 200, unit: "Gram" }],
      selling_price: 300,
    });
    expect(res.isError).toBe(false);
    const created = res.data.created as { id: string; total_cost: number; status: string };
    expect(created.status).toBe("draft");
    expect(created.total_cost).toBeGreaterThan(0);
  });

  it("rejects a unit that can't convert, instead of silently costing nothing", async () => {
    const res = await call("create_recipe", {
      name: "MCP Bad Unit",
      category: "Mains",
      brand: "capiche",
      ingredients: [{ ingredient: "Onion", quantity: 2, unit: "Litre" }],
    });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/can't be converted/i);
  });

  it("names the ingredient it couldn't find", async () => {
    const res = await call("create_recipe", {
      name: "MCP Missing",
      category: "Mains",
      brand: "capiche",
      ingredients: [{ ingredient: "Unobtainium", quantity: 1, unit: "Gram" }],
    });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/Unobtainium/);
  });

  it("keeps everything not mentioned when updating", async () => {
    await call("create_recipe", {
      name: "MCP Keeper",
      category: "Mains",
      brand: "capiche",
      serving_size: 4,
      ingredients: [
        { ingredient: "Onion", quantity: 100, unit: "Gram" },
        { ingredient: "Tomato", quantity: 50, unit: "Gram" },
      ],
      selling_price: 500,
      wastage_pct: 7,
      method: ["Chop", "Cook"],
    });

    const res = await call("update_recipe", { recipe: "MCP Keeper", category: "Starters" });
    expect(res.isError).toBe(false);

    const recipe = (await recipesRepo.list()).find((r) => r.recipe_name === "MCP Keeper")!;
    const full = await recipesRepo.getWithIngredients(recipe.id);
    expect(recipe.category).toBe("Starters");
    // None of these were passed — they must survive the full-replace update.
    expect(recipe.selling_price).toBe(500);
    expect(recipe.wastage_pct).toBe(7);
    expect(recipe.serving_size).toBe(4);
    expect(recipe.method).toEqual(["Chop", "Cook"]);
    expect(full?.ingredients.length).toBe(2);
  });

  it("keeps a prep's batch yield when editing, so parent recipes stay priced", async () => {
    await call("create_recipe", {
      name: "MCP Sauce",
      category: "Sauces",
      brand: "capiche",
      is_prep: true,
      ingredients: [{ ingredient: "Tomato", quantity: 500, unit: "Gram" }],
      yield_quantity: 400,
    });
    const before = (await recipesRepo.list()).find((r) => r.recipe_name === "MCP Sauce")!;
    expect(before.yield_quantity).toBe(400);

    await call("update_recipe", { recipe: "MCP Sauce", category: "Prep Sauces" });
    const after = (await recipesRepo.list()).find((r) => r.recipe_name === "MCP Sauce")!;
    expect(after.yield_quantity).toBe(400); // not recomputed from line quantities
  });

  it("appends ingredients without dropping the existing ones", async () => {
    await call("create_recipe", {
      name: "MCP Append",
      category: "Mains",
      brand: "capiche",
      ingredients: [{ ingredient: "Onion", quantity: 100, unit: "Gram" }],
    });
    const res = await call("add_recipe_ingredients", {
      recipe: "MCP Append",
      ingredients: [{ ingredient: "Tomato", quantity: 80, unit: "Gram" }],
    });
    expect(res.isError).toBe(false);
    expect(res.data.total_lines).toBe(2);

    // Adding the same ingredient again updates that line rather than duplicating it.
    const again = await call("add_recipe_ingredients", {
      recipe: "MCP Append",
      ingredients: [{ ingredient: "Tomato", quantity: 120, unit: "Gram" }],
    });
    expect(again.data.total_lines).toBe(2);
    expect(again.data.replaced).toBe(1);
  });

  it("sets a menu price and refuses a cooked weight on a non-prep", async () => {
    await call("create_recipe", {
      name: "MCP Priced",
      category: "Mains",
      brand: "capiche",
      ingredients: [{ ingredient: "Onion", quantity: 100, unit: "Gram" }],
    });
    const priced = await call("set_recipe_price", { recipe: "MCP Priced", price: 420 });
    expect((priced.data.updated as { selling_price: number }).selling_price).toBe(420);

    const weight = await call("set_prep_cooked_weight", { prep: "MCP Priced", grams: 900 });
    expect(weight.isError).toBe(true);
    expect(weight.text).toMatch(/not an in-house prep/i);
  });
});

describe("catalogue tools — wastage", () => {
  beforeEach(() => {
    resetDb();
    asAdmin();
  });

  it("records an entry and prices it from current costs", async () => {
    const outlets = JSON.parse((await call("list_brands_and_outlets")).text) as {
      outlets: { id: string; name: string }[];
    };
    const outlet = outlets.outlets[0];

    const res = await call("record_wastage", {
      date: "2026-10-13",
      outlet: outlet.name,
      wastage_type: "Spoilage",
      department: "Kitchen Staff",
      items: [{ item: "Onion", type: "ingredient", quantity: 500 }],
      reason: "Left out overnight",
    });
    expect(res.isError).toBe(false);
    const recorded = res.data.recorded as { id: string; total_cost: number };
    expect(recorded.total_cost).toBeGreaterThan(0);

    const entry = await wastageRepo.getWithLines(recorded.id);
    expect(entry?.lines).toHaveLength(1);
    expect(entry?.lines[0].unit_cost).toBeGreaterThan(0);

    const listed = await call("list_wastage", { limit: 5 });
    expect((listed.data.total as number) >= 1).toBe(true);
  });

  it("names an outlet it can't find", async () => {
    const res = await call("record_wastage", {
      date: "2026-10-13",
      outlet: "Mars Branch",
      wastage_type: "Spoilage",
      department: "Kitchen Staff",
      items: [{ item: "Onion", type: "ingredient", quantity: 1 }],
    });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/Mars Branch/);
  });
});
