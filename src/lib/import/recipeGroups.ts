// Recipe/prep import rows are one row PER INGREDIENT, so they have to be grouped
// by recipe name before anything can be written. Rows carrying a Size split into a
// 15-inch master + an 11-inch variant. Both repos (mock + Supabase) and the import
// preview use this one grouper, so the dry run can never disagree with the import.

import type { ImportRecipeLine } from "../data/mock/recipes";

export type SizeCode = "11_INCH" | "15_INCH" | null;

/** One recipe to upsert: a size variant with the ingredient lines that belong to it. */
export interface RecipeVariant {
  sizeCode: SizeCode;
  lines: ImportRecipeLine[];
}

export interface RecipeGroup {
  /** Display name, trimmed (first row of the group wins). */
  name: string;
  category: string;
  /** One entry for a plain recipe; 15-inch first, then 11-inch, for sized ones. */
  variants: RecipeVariant[];
  /** Every line in the group, in file order. */
  lines: ImportRecipeLine[];
}

/** Group import lines by recipe name (case-insensitive), preserving file order. */
export function groupRecipeLines(rows: ImportRecipeLine[]): RecipeGroup[] {
  const groups = new Map<string, ImportRecipeLine[]>();
  for (const l of rows) {
    const key = l.recipe_name.trim().toLowerCase();
    const arr = groups.get(key);
    if (arr) arr.push(l);
    else groups.set(key, [l]);
  }

  return [...groups.values()].map((lines) => {
    const name = lines[0].recipe_name.trim();
    const category = lines[0].category || "Uncategorised";
    const variants: RecipeVariant[] = [];
    if (lines.some((l) => l.size)) {
      const fifteen = lines.filter((l) => l.size === "15_INCH");
      const eleven = lines.filter((l) => l.size === "11_INCH");
      if (fifteen.length) variants.push({ sizeCode: "15_INCH", lines: fifteen });
      if (eleven.length) variants.push({ sizeCode: "11_INCH", lines: eleven });
    } else {
      variants.push({ sizeCode: null, lines });
    }
    return { name, category, variants, lines };
  });
}

/** Menu price / packaging for a variant: the first line that carries one. */
export function variantPricing(lines: ImportRecipeLine[]): {
  selling: number | null;
  packaging: number | null;
} {
  return {
    selling: lines.find((l) => l.selling_price != null)?.selling_price ?? null,
    packaging: lines.find((l) => l.packaging_cost != null)?.packaging_cost ?? null,
  };
}
