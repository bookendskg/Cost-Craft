// "Where is this ingredient used?" — the index behind the Recipes Using This dialog
// on both Raw Materials and Yield Management.
//
// A recipe line points at a raw material (component_type 'material') or at an
// in-house prep (component_type 'recipe'), so an ingredient can be used two ways:
// directly in a recipe, or inside a prep that other recipes then use. Listing only
// the direct lines makes an ingredient that lives in a prep — a sauce base, a
// masala — look almost unused, so the walk continues upward through the preps and
// records which prep carried it there.

import type { ComponentType } from "./data/types";

/** One recipe that uses the ingredient. `viaPrep` names the prep it came through. */
export interface RecipeUse {
  id: string;
  name: string;
  viaPrep?: string;
}

/** The shape this needs from a recipe line — real rows satisfy it. */
export interface UsageLine {
  recipe_id: string;
  ingredient_id: string;
  component_type: ComponentType;
}

/** The shape this needs from a recipe. */
export interface UsageRecipe {
  id: string;
  recipe_name: string;
}

/**
 * ingredient id → the recipes using it, direct uses first.
 *
 * A recipe is listed once: if it uses the ingredient both directly and through a
 * prep, the direct use wins. Cycles (a prep that somehow reaches itself) are
 * guarded with a seen set.
 */
export function buildRecipeUsage(lines: UsageLine[], recipes: UsageRecipe[]): Map<string, RecipeUse[]> {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));

  // prep id → the recipes that use that prep as a component.
  const parentsOfPrep = new Map<string, string[]>();
  for (const line of lines) {
    if (line.component_type !== "recipe") continue;
    const list = parentsOfPrep.get(line.ingredient_id) ?? [];
    if (!list.includes(line.recipe_id)) list.push(line.recipe_id);
    parentsOfPrep.set(line.ingredient_id, list);
  }

  const usage = new Map<string, RecipeUse[]>();

  const add = (ingredientId: string, use: RecipeUse) => {
    const list = usage.get(ingredientId) ?? [];
    const existing = list.find((u) => u.id === use.id);
    if (existing) {
      // A direct use replaces one found through a prep; otherwise keep the first.
      if (!use.viaPrep && existing.viaPrep) existing.viaPrep = undefined;
      return;
    }
    list.push(use);
    usage.set(ingredientId, list);
  };

  for (const line of lines) {
    if (line.component_type === "recipe") continue;
    const recipe = recipeById.get(line.recipe_id);
    if (!recipe) continue;
    add(line.ingredient_id, { id: recipe.id, name: recipe.recipe_name });

    // Everything that uses this recipe as a prep uses the ingredient too.
    const seen = new Set<string>([recipe.id]);
    let frontier = parentsOfPrep.get(recipe.id) ?? [];
    while (frontier.length) {
      const next: string[] = [];
      for (const parentId of frontier) {
        if (seen.has(parentId)) continue;
        seen.add(parentId);
        const parent = recipeById.get(parentId);
        if (parent) add(line.ingredient_id, { id: parent.id, name: parent.recipe_name, viaPrep: recipe.recipe_name });
        next.push(...(parentsOfPrep.get(parentId) ?? []));
      }
      frontier = next;
    }
  }

  // Direct uses first, then alphabetical, so the dialog reads predictably.
  for (const list of usage.values()) {
    list.sort((a, b) => Number(!!a.viaPrep) - Number(!!b.viaPrep) || a.name.localeCompare(b.name));
  }
  return usage;
}
