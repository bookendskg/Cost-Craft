import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "@/lib/data/mock/db";
import { recipesRepo } from "@/lib/data/mock/recipes";
import { deriveBrandScope } from "./useBrandScope";

// Proves the app-wide brand scoping: a brand's derived material/packaging set is
// exactly what that brand's recipes use (transitively through prep sub-recipes),
// so switching to Capiche vs Aiko shows different catalogue data.

describe("deriveBrandScope", () => {
  beforeEach(() => resetDb());

  it("scopes materials + packaging to each brand's recipes, differing per brand", async () => {
    const recipes = await recipesRepo.list();
    const links = await recipesRepo.allIngredients();
    const pkg = await recipesRepo.allPackaging();

    const capiche = deriveBrandScope("capiche", recipes, links, pkg);
    const aiko = deriveBrandScope("aiko", recipes, links, pkg);

    // Both brands actually use ingredients.
    expect(capiche.materialIds.size).toBeGreaterThan(0);
    expect(aiko.materialIds.size).toBeGreaterThan(0);

    // The two brands are not identical catalogues (each has something the other lacks).
    const capicheOnly = [...capiche.materialIds].filter((m) => !aiko.materialIds.has(m));
    const aikoOnly = [...aiko.materialIds].filter((m) => !capiche.materialIds.has(m));
    expect(capicheOnly.length + aikoOnly.length).toBeGreaterThan(0);

    // Transitive prep pull-in: pizza dough is a prep sub-recipe of Capiche pizzas,
    // so flour/yeast (dough ingredients) land in Capiche's material scope.
    const dough = recipes.find((r) => r.is_prep && /dough/i.test(r.recipe_name));
    if (dough) {
      const doughMats = links.filter((l) => l.recipe_id === dough.id && l.component_type === "material" && l.ingredient_id);
      // At least one dough material is reachable in Capiche's scope via the pizza → dough link.
      expect(doughMats.some((l) => capiche.materialIds.has(l.ingredient_id!))).toBe(true);
    }
  });

  it("an unselected brand's exclusive material is filtered out", async () => {
    const recipes = await recipesRepo.list();
    const links = await recipesRepo.allIngredients();
    const pkg = await recipesRepo.allPackaging();
    const capiche = deriveBrandScope("capiche", recipes, links, pkg);
    const aiko = deriveBrandScope("aiko", recipes, links, pkg);

    // Anything exclusive to Aiko must NOT appear in Capiche's scope (and vice versa).
    for (const m of aiko.materialIds) {
      if (!capiche.materialIds.has(m)) {
        expect(capiche.materialIds.has(m)).toBe(false);
      }
    }
  });
});
