import { describe, it, expect } from "vitest";
import { buildRecipeUsage, type UsageLine, type UsageRecipe } from "./recipeUsage";

const recipes: UsageRecipe[] = [
  { id: "r-pizza", recipe_name: "Margherita" },
  { id: "r-pasta", recipe_name: "Arrabbiata" },
  { id: "p-sauce", recipe_name: "Tomato Sauce" },
  { id: "p-base", recipe_name: "Masala Base" },
];

const line = (recipe_id: string, ingredient_id: string, component_type: "material" | "recipe" = "material"): UsageLine => ({
  recipe_id,
  ingredient_id,
  component_type,
});

describe("buildRecipeUsage", () => {
  it("lists the recipes that use an ingredient directly", () => {
    const usage = buildRecipeUsage([line("r-pizza", "i-tomato"), line("r-pasta", "i-chilli")], recipes);
    expect(usage.get("i-tomato")).toEqual([{ id: "r-pizza", name: "Margherita" }]);
    expect(usage.get("i-chilli")).toEqual([{ id: "r-pasta", name: "Arrabbiata" }]);
    expect(usage.get("i-unused")).toBeUndefined();
  });

  it("follows preps, naming the prep the ingredient came through", () => {
    const usage = buildRecipeUsage(
      [line("p-sauce", "i-tomato"), line("r-pizza", "p-sauce", "recipe"), line("r-pasta", "p-sauce", "recipe")],
      recipes,
    );
    expect(usage.get("i-tomato")).toEqual([
      { id: "p-sauce", name: "Tomato Sauce" },
      { id: "r-pasta", name: "Arrabbiata", viaPrep: "Tomato Sauce" },
      { id: "r-pizza", name: "Margherita", viaPrep: "Tomato Sauce" },
    ]);
  });

  it("walks a prep inside a prep", () => {
    const usage = buildRecipeUsage(
      [line("p-base", "i-chilli"), line("p-sauce", "p-base", "recipe"), line("r-pizza", "p-sauce", "recipe")],
      recipes,
    );
    expect(usage.get("i-chilli")?.map((u) => u.id)).toEqual(["p-base", "r-pizza", "p-sauce"]);
    expect(usage.get("i-chilli")?.find((u) => u.id === "r-pizza")?.viaPrep).toBe("Masala Base");
  });

  it("lists a recipe once, preferring the direct use over the prep route", () => {
    const usage = buildRecipeUsage(
      [line("r-pizza", "i-tomato"), line("p-sauce", "i-tomato"), line("r-pizza", "p-sauce", "recipe")],
      recipes,
    );
    const pizza = usage.get("i-tomato")!.filter((u) => u.id === "r-pizza");
    expect(pizza).toHaveLength(1);
    expect(pizza[0].viaPrep).toBeUndefined();
  });

  it("survives a prep cycle instead of looping forever", () => {
    const usage = buildRecipeUsage(
      [line("p-sauce", "i-tomato"), line("p-base", "p-sauce", "recipe"), line("p-sauce", "p-base", "recipe")],
      recipes,
    );
    expect(usage.get("i-tomato")?.map((u) => u.id).sort()).toEqual(["p-base", "p-sauce"]);
  });

  it("ignores lines whose recipe is missing", () => {
    const usage = buildRecipeUsage([line("r-gone", "i-tomato")], recipes);
    expect(usage.get("i-tomato")).toBeUndefined();
  });
});
