// Catalogue-editing tools: packaging, recipes, in-house prep and wastage.
//
// These are the parts of KostKraft an Admin manages day to day. Deliberately NOT
// here: approvals (a human decision), reports, and anything destructive — an
// assistant can create and edit, never delete.
//
// Two things the repos do NOT do for you, which these tools must:
//   • recipesRepo.update replaces the whole header and the whole ingredient list,
//     so every edit first reads the current recipe and merges (otherwise omitting
//     a field silently wipes it — a prep's yield_quantity especially).
//   • in Supabase mode packaging_cost is not derived from the packaging lines, so
//     it's computed here exactly as the recipe editor does.

import { z } from "zod";

import {
  applicableUnitCost,
  brandsRepo,
  materialsRepo,
  outletsRepo,
  packagingRepo,
  recipesRepo,
  wastageRepo,
  yieldsRepo,
  type RecipeHeaderInput,
  type RecipeLineInput,
  type WastageInput,
} from "@/lib/data";
import { DEPARTMENTS, WASTAGE_TYPES, type Department, type WastageType } from "@/lib/data/types";
import { canConvert } from "@/lib/units";
import {
  CATALOG_EDITORS,
  actor,
  defineTool,
  fail,
  findMaterial,
  findRecipe,
  norm,
  requireRole,
  text,
  type ToolDef,
} from "./toolkit.js";

/** packaging_items writes are admin-only in the database (0025). */
const PACKAGING_EDITORS = ["super_admin", "admin"];

// ── Ingredient / sub-recipe line resolution ─────────────────────────────────
const lineSchema = z.object({
  ingredient: z.string().describe("Ingredient or in-house prep name (or id)"),
  quantity: z.number().positive(),
  unit: z.string().describe("Gram, KG, ML, Litre, Piece…"),
  cut: z.string().optional().describe('Named prep variant, e.g. "Chopped"'),
});
type LineSpec = z.infer<typeof lineSchema>;

/** Turn human line specs into repo input, failing loudly on anything unusable. */
async function resolveLines(specs: LineSpec[]): Promise<{ lines: RecipeLineInput[] } | { error: string }> {
  const lines: RecipeLineInput[] = [];
  for (const spec of specs) {
    const material = await findMaterial(spec.ingredient);
    const prep = material ? null : await findRecipe(spec.ingredient);
    if (!material && !prep) return { error: `No ingredient or prep matches "${spec.ingredient}".` };

    // An unconvertible unit doesn't error in the repos — the line just costs
    // nothing and quietly drops out of the total. Catch it here instead.
    const base = material ? material.base_unit : prep!.yield_unit;
    if (!canConvert(spec.unit, base)) {
      return {
        error: `"${spec.unit}" can't be converted to ${base} for ${spec.ingredient}. Use a compatible unit.`,
      };
    }
    lines.push({
      ingredient_id: material ? material.id : prep!.id,
      component_type: material ? "material" : "recipe",
      quantity_used: spec.quantity,
      unit_used: spec.unit,
      wastage_override_pct: null,
      cut_type: spec.cut ?? null,
    });
  }
  return { lines };
}

const packagingSpecSchema = z.object({
  item: z.string().describe("Packaging item name (or id)"),
  quantity: z.number().positive(),
});

/** Packaging lines + the per-portion cost the repos expect the caller to compute. */
async function resolvePackaging(
  specs: { item: string; quantity: number }[],
): Promise<{ lines: { packaging_item_id: string; quantity_used: number }[]; cost: number } | { error: string }> {
  const items = await packagingRepo.list();
  const lines = [];
  let cost = 0;
  for (const spec of specs) {
    const item =
      items.find((p) => p.id === spec.item) ??
      items.find((p) => norm(p.name) === norm(spec.item)) ??
      items.find((p) => norm(p.name).includes(norm(spec.item)));
    if (!item) return { error: `No packaging item matches "${spec.item}".` };
    lines.push({ packaging_item_id: item.id, quantity_used: spec.quantity });
    cost += (item.unit_price ?? 0) * spec.quantity;
  }
  return { lines, cost: Math.round(cost * 100) / 100 };
}

const recipeView = (r: Awaited<ReturnType<typeof recipesRepo.getById>>) =>
  r && {
    id: r.id,
    name: r.recipe_name,
    category: r.category,
    is_prep: r.is_prep,
    status: r.status,
    serving_size: r.serving_size,
    total_cost: r.total_cost,
    cost_per_portion: r.cost_per_portion,
    selling_price: r.selling_price,
    packaging_cost: r.packaging_cost,
    yield_quantity: r.yield_quantity,
    yield_unit: r.yield_unit,
  };

export const CATALOG_TOOLS: ToolDef[] = [
  // ── Brands & outlets (lookups the write tools need) ───────────────────────
  defineTool(
    "list_brands_and_outlets",
    {
      title: "List brands and outlets",
      description:
        "Brands and their outlets, with the ids that recipes and wastage entries need. Use this before creating a recipe or recording wastage.",
      inputSchema: {},
    },
    async () => {
      const [brands, outlets] = await Promise.all([brandsRepo.list(), outletsRepo.list()]);
      return text({
        brands: brands
          .filter((b) => b.status === "active")
          .map((b) => ({ id: b.id, name: b.name })),
        outlets: outlets
          .filter((o) => o.status === "active")
          .map((o) => ({ id: o.id, name: o.name, brand_id: o.brand_id })),
      });
    },
  ),

  // ── Packaging ─────────────────────────────────────────────────────────────
  defineTool(
    "create_packaging",
    {
      title: "Create a packaging item",
      description:
        "Add a packaging item (box, sleeve, container…) with its unit price. Recipes then reference it to carry a packaging cost.",
      inputSchema: {
        name: z.string().min(1),
        type: z.enum(["primary", "secondary", "tertiary"]).default("primary"),
        unit: z.string().default("Piece").describe("Piece, Packet, Roll, Box…"),
        unit_price: z.number().min(0),
        notes: z.string().optional(),
      },
    },
    async ({ name, type, unit, unit_price, notes }) => {
      const denied = requireRole(PACKAGING_EDITORS, "manage packaging");
      if (denied) return fail(denied);
      const item = await packagingRepo.create(
        { name: name.trim(), packaging_type: type, unit: unit || "Piece", unit_price, notes: notes ?? null },
        actor.userId,
      );
      return text({ created: { id: item.id, name: item.name, type: item.packaging_type, unit: item.unit, price: item.unit_price } });
    },
  ),

  defineTool(
    "update_packaging",
    {
      title: "Update a packaging item",
      description:
        "Change a packaging item's price, unit, type or status. Note: recipes keep the price they captured until they're saved again.",
      inputSchema: {
        item: z.string().describe("Packaging item name or id"),
        unit_price: z.number().min(0).optional(),
        unit: z.string().optional(),
        type: z.enum(["primary", "secondary", "tertiary"]).optional(),
        name: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        notes: z.string().optional(),
      },
    },
    async ({ item, unit_price, unit, type, name, status, notes }) => {
      const denied = requireRole(PACKAGING_EDITORS, "manage packaging");
      if (denied) return fail(denied);
      const all = await packagingRepo.list();
      const existing =
        all.find((p) => p.id === item) ??
        all.find((p) => norm(p.name) === norm(item)) ??
        all.find((p) => norm(p.name).includes(norm(item)));
      if (!existing) return fail(`No packaging item matches "${item}".`);

      // update() overwrites every field, so unspecified ones are carried over.
      const saved = await packagingRepo.update(
        existing.id,
        {
          name: name?.trim() || existing.name,
          packaging_type: type ?? existing.packaging_type,
          unit: unit ?? existing.unit,
          unit_price: unit_price ?? existing.unit_price,
          status: status ?? existing.status,
          notes: notes ?? existing.notes,
        },
        actor.userId,
      );
      return text({
        updated: { id: saved.id, name: saved.name, type: saved.packaging_type, unit: saved.unit, price: saved.unit_price, status: saved.status },
        was: { price: existing.unit_price, status: existing.status },
      });
    },
  ),

  // ── Recipes & in-house prep ───────────────────────────────────────────────
  defineTool(
    "create_recipe",
    {
      title: "Create a recipe or in-house prep",
      description:
        "Create a menu recipe (or an in-house prep with is_prep) and its ingredient lines. It starts as a draft; a person approves it in the app. Ingredients must already exist — create them first if needed.",
      inputSchema: {
        name: z.string().min(1),
        category: z.string().min(1),
        brand: z.string().describe("Brand name or id — see list_brands_and_outlets"),
        is_prep: z.boolean().default(false),
        serving_size: z.number().int().min(1).default(1).describe("Portions the batch yields"),
        ingredients: z.array(lineSchema).min(1),
        packaging: z.array(packagingSpecSchema).optional(),
        selling_price: z.number().min(0).nullable().optional(),
        wastage_pct: z.number().min(0).max(100).optional(),
        yield_quantity: z.number().positive().optional().describe("Prep batch output, in yield_unit"),
        yield_unit: z.string().optional().describe("Prep output unit (default Gram)"),
        method: z.array(z.string()).optional().describe("Preparation steps, one per line"),
        description: z.string().optional(),
      },
    },
    async (args) => {
      const denied = requireRole(CATALOG_EDITORS, "create recipes");
      if (denied) return fail(denied);

      const brands = await brandsRepo.list();
      const brand =
        brands.find((b) => b.id === args.brand) ?? brands.find((b) => norm(b.name) === norm(args.brand));
      if (!brand) return fail(`No brand matches "${args.brand}". Call list_brands_and_outlets first.`);

      const resolved = await resolveLines(args.ingredients);
      if ("error" in resolved) return fail(resolved.error);

      let packagingLines: { packaging_item_id: string; quantity_used: number }[] | undefined;
      let packagingCost = 0;
      if (args.packaging?.length) {
        const pack = await resolvePackaging(args.packaging);
        if ("error" in pack) return fail(pack.error);
        packagingLines = pack.lines;
        packagingCost = pack.cost;
      }

      const header: RecipeHeaderInput = {
        recipe_name: args.name.trim(),
        created_by_name: actor.name,
        category: args.category.trim(),
        brand: brand.id,
        description: args.description ?? null,
        method: args.method ?? [],
        preparation_time: null,
        serving_size: args.serving_size,
        selling_price: args.is_prep ? null : (args.selling_price ?? null),
        packaging_cost: args.is_prep ? 0 : packagingCost,
        wastage_pct: args.wastage_pct ?? 0,
        is_prep: args.is_prep,
        yield_quantity: args.yield_quantity,
        yield_unit: args.yield_unit,
        packaging: packagingLines,
      };

      const recipe = await recipesRepo.create(header, resolved.lines, actor.userId);
      return text({
        created: recipeView(recipe),
        note: "Saved as a draft. Costs were calculated from the ingredient prices; a Super Admin can revert this from the Activity Log.",
      });
    },
  ),

  defineTool(
    "update_recipe",
    {
      title: "Update a recipe or prep",
      description:
        "Change a recipe's details and/or its ingredient list. Anything you don't pass is kept as it is. Passing `ingredients` REPLACES the whole list — use add_recipe_ingredients to add to it. An approved recipe goes back to draft when edited.",
      inputSchema: {
        recipe: z.string().describe("Recipe name or id"),
        name: z.string().optional(),
        category: z.string().optional(),
        serving_size: z.number().int().min(1).optional(),
        ingredients: z.array(lineSchema).min(1).optional().describe("Replaces every existing line"),
        packaging: z.array(packagingSpecSchema).optional().describe("Replaces the packaging lines"),
        selling_price: z.number().min(0).nullable().optional(),
        wastage_pct: z.number().min(0).max(100).optional(),
        yield_quantity: z.number().positive().optional(),
        method: z.array(z.string()).optional(),
        description: z.string().optional(),
      },
    },
    async (args) => {
      const denied = requireRole(CATALOG_EDITORS, "edit recipes");
      if (denied) return fail(denied);
      const found = await findRecipe(args.recipe);
      if (!found) return fail(`No recipe matches "${args.recipe}".`);
      const full = await recipesRepo.getWithIngredients(found.id);
      if (!full) return fail("That recipe could not be loaded.");
      const current = full.recipe;

      // update() replaces the header wholesale, so start from what's there.
      let lines: RecipeLineInput[] = full.ingredients.map((i) => ({
        ingredient_id: i.ingredient_id,
        component_type: i.component_type,
        quantity_used: i.quantity_used,
        unit_used: i.unit_used,
        wastage_override_pct: i.wastage_override_pct ?? null,
        cut_type: i.cut_type ?? null,
      }));
      if (args.ingredients) {
        const resolved = await resolveLines(args.ingredients);
        if ("error" in resolved) return fail(resolved.error);
        lines = resolved.lines;
      }

      let packagingLines: { packaging_item_id: string; quantity_used: number }[] | undefined;
      let packagingCost = current.packaging_cost ?? 0;
      if (args.packaging) {
        const pack = await resolvePackaging(args.packaging);
        if ("error" in pack) return fail(pack.error);
        packagingLines = pack.lines;
        packagingCost = pack.cost;
      }

      const header: RecipeHeaderInput = {
        recipe_name: args.name?.trim() || current.recipe_name,
        created_by_name: current.created_by_name ?? actor.name,
        category: args.category?.trim() || current.category,
        brand: current.brand,
        description: args.description ?? current.description,
        method: args.method ?? current.method ?? [],
        preparation_time: current.preparation_time,
        serving_size: args.serving_size ?? current.serving_size,
        selling_price: args.selling_price !== undefined ? args.selling_price : current.selling_price,
        packaging_cost: packagingCost,
        wastage_pct: args.wastage_pct ?? current.wastage_pct ?? 0,
        is_prep: current.is_prep,
        // Omitting this would make the repo recompute it from the line quantities,
        // silently re-pricing every recipe that uses this prep.
        yield_quantity: args.yield_quantity ?? current.yield_quantity,
        yield_unit: current.yield_unit,
        packaging: packagingLines,
      };

      const saved = await recipesRepo.update(current.id, header, lines, actor.userId);
      return text({
        updated: recipeView(saved),
        lines: lines.length,
        note:
          current.status === "approved"
            ? "This recipe was approved; editing returned it to draft for re-approval."
            : undefined,
      });
    },
  ),

  defineTool(
    "add_recipe_ingredients",
    {
      title: "Add ingredients to a recipe",
      description:
        "Append ingredient lines to a recipe, keeping everything already there. An existing line for the same ingredient is updated to the new quantity.",
      inputSchema: {
        recipe: z.string(),
        ingredients: z.array(lineSchema).min(1),
      },
    },
    async ({ recipe, ingredients }) => {
      const denied = requireRole(CATALOG_EDITORS, "edit recipes");
      if (denied) return fail(denied);
      const found = await findRecipe(recipe);
      if (!found) return fail(`No recipe matches "${recipe}".`);
      const full = await recipesRepo.getWithIngredients(found.id);
      if (!full) return fail("That recipe could not be loaded.");

      const resolved = await resolveLines(ingredients);
      if ("error" in resolved) return fail(resolved.error);

      const lines: RecipeLineInput[] = full.ingredients.map((i) => ({
        ingredient_id: i.ingredient_id,
        component_type: i.component_type,
        quantity_used: i.quantity_used,
        unit_used: i.unit_used,
        wastage_override_pct: i.wastage_override_pct ?? null,
        cut_type: i.cut_type ?? null,
      }));
      const added: string[] = [];
      const replaced: string[] = [];
      for (const line of resolved.lines) {
        const at = lines.findIndex((l) => l.ingredient_id === line.ingredient_id);
        if (at >= 0) {
          lines[at] = line;
          replaced.push(line.ingredient_id);
        } else {
          lines.push(line);
          added.push(line.ingredient_id);
        }
      }

      const current = full.recipe;
      const saved = await recipesRepo.update(
        current.id,
        {
          recipe_name: current.recipe_name,
          created_by_name: current.created_by_name ?? actor.name,
          category: current.category,
          brand: current.brand,
          description: current.description,
          method: current.method ?? [],
          preparation_time: current.preparation_time,
          serving_size: current.serving_size,
          selling_price: current.selling_price,
          packaging_cost: current.packaging_cost ?? 0,
          wastage_pct: current.wastage_pct ?? 0,
          is_prep: current.is_prep,
          yield_quantity: current.yield_quantity,
          yield_unit: current.yield_unit,
        },
        lines,
        actor.userId,
      );
      return text({ updated: recipeView(saved), added: added.length, replaced: replaced.length, total_lines: lines.length });
    },
  ),

  defineTool(
    "set_recipe_price",
    {
      title: "Set a recipe's menu price",
      description: "Set (or clear) the selling price of a menu recipe. Food-cost percentages follow from it.",
      inputSchema: {
        recipe: z.string(),
        price: z.number().min(0).nullable().describe("null clears the price"),
      },
    },
    async ({ recipe, price }) => {
      const denied = requireRole(CATALOG_EDITORS, "edit recipes");
      if (denied) return fail(denied);
      const found = await findRecipe(recipe);
      if (!found) return fail(`No recipe matches "${recipe}".`);
      const saved = await recipesRepo.setSellingPrice(found.id, price, actor.userId);
      return text({ updated: recipeView(saved), was: found.selling_price });
    },
  ),

  defineTool(
    "set_prep_cooked_weight",
    {
      title: "Set a prep's cooked weight",
      description:
        "Record what a prep batch weighs after cooking, in grams. This is the denominator for pricing it into other recipes, so every recipe using it is re-costed.",
      inputSchema: {
        prep: z.string().describe("In-house prep name or id"),
        grams: z.number().positive().nullable().describe("null clears it (falls back to the raw yield)"),
      },
    },
    async ({ prep, grams }) => {
      const denied = requireRole(CATALOG_EDITORS, "edit recipes");
      if (denied) return fail(denied);
      const found = await findRecipe(prep);
      if (!found) return fail(`No prep matches "${prep}".`);
      if (!found.is_prep) return fail(`"${found.recipe_name}" is a menu recipe, not an in-house prep.`);
      const saved = await recipesRepo.setCookedWeight(found.id, grams, actor.userId);
      return text({ updated: recipeView(saved), note: "Recipes using this prep were re-costed." });
    },
  ),

  // ── Wastage ───────────────────────────────────────────────────────────────
  defineTool(
    "record_wastage",
    {
      title: "Record wastage",
      description:
        "Log wasted ingredients or dishes for an outlet. The cost of each line is worked out from current prices and yields, exactly as the wastage form does.",
      inputSchema: {
        date: z.string().describe("YYYY-MM-DD"),
        outlet: z.string().describe("Outlet name or id — see list_brands_and_outlets"),
        wastage_type: z.enum(WASTAGE_TYPES),
        department: z.enum(DEPARTMENTS),
        items: z
          .array(
            z.object({
              item: z.string().describe("Ingredient name, or recipe name for a finished dish"),
              type: z.enum(["ingredient", "recipe"]).default("ingredient"),
              quantity: z.number().positive(),
            }),
          )
          .min(1),
        reason: z.string().optional(),
        done_by: z.string().optional().describe("Who handled it"),
        notes: z.string().optional(),
      },
    },
    async (args) => {
      const denied = requireRole(CATALOG_EDITORS, "record wastage");
      if (denied) return fail(denied);

      const outlets = await outletsRepo.list();
      const outlet =
        outlets.find((o) => o.id === args.outlet) ??
        outlets.find((o) => norm(o.name) === norm(args.outlet)) ??
        outlets.find((o) => norm(o.name).includes(norm(args.outlet)));
      if (!outlet) return fail(`No outlet matches "${args.outlet}". Call list_brands_and_outlets first.`);

      const [materials, recipes, yields] = await Promise.all([
        materialsRepo.list(),
        recipesRepo.list(),
        yieldsRepo.list(),
      ]);

      const lines = [];
      for (const item of args.items) {
        if (item.type === "recipe") {
          const recipe = await findRecipe(item.item);
          if (!recipe) return fail(`No recipe matches "${item.item}".`);
          const unitCost = applicableUnitCost("recipe", recipe.id, materials, recipes, yields);
          lines.push({
            item_type: "recipe" as const,
            ingredient_id: null,
            recipe_id: recipe.id,
            quantity: item.quantity,
            unit: "Portion",
            unit_cost: Math.round(unitCost * 100) / 100,
          });
        } else {
          const material = await findMaterial(item.item);
          if (!material) return fail(`No ingredient matches "${item.item}".`);
          const unitCost = applicableUnitCost("ingredient", material.id, materials, recipes, yields);
          lines.push({
            item_type: "ingredient" as const,
            ingredient_id: material.id,
            recipe_id: null,
            quantity: item.quantity,
            unit: material.base_unit,
            unit_cost: Math.round(unitCost * 100) / 100,
          });
        }
      }

      const input: WastageInput = {
        wastage_date: args.date,
        brand: outlet.brand_id,
        outlet_id: outlet.id,
        wastage_type: args.wastage_type as WastageType,
        department: args.department as Department,
        reason: args.reason ?? null,
        done_by: args.done_by ?? actor.name,
        notes: args.notes ?? null,
        lines,
      };
      const entry = await wastageRepo.create(input, actor.userId);
      return text({
        recorded: {
          id: entry.id,
          date: entry.wastage_date,
          outlet: outlet.name,
          type: entry.wastage_type,
          total_cost: entry.total_cost,
          items: lines.length,
        },
      });
    },
  ),

  defineTool(
    "list_wastage",
    {
      title: "List wastage entries",
      description: "Recent wastage entries with their cost, newest first.",
      inputSchema: {
        outlet: z.string().optional(),
        from: z.string().optional().describe("YYYY-MM-DD"),
        to: z.string().optional().describe("YYYY-MM-DD"),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ outlet, from, to, limit }) => {
      const [entries, outlets] = await Promise.all([wastageRepo.list(), outletsRepo.list()]);
      const byId = new Map(outlets.map((o) => [o.id, o.name]));
      let rows = entries;
      if (outlet) {
        const match = outlets.find((o) => o.id === outlet || norm(o.name).includes(norm(outlet)));
        if (!match) return fail(`No outlet matches "${outlet}".`);
        rows = rows.filter((w) => w.outlet_id === match.id);
      }
      if (from) rows = rows.filter((w) => w.wastage_date >= from);
      if (to) rows = rows.filter((w) => w.wastage_date <= to);
      return text({
        total: rows.length,
        total_cost: Math.round(rows.reduce((s, w) => s + (w.total_cost ?? 0), 0) * 100) / 100,
        entries: rows.slice(0, limit ?? 50).map((w) => ({
          id: w.id,
          date: w.wastage_date,
          outlet: byId.get(w.outlet_id) ?? w.outlet_id,
          type: w.wastage_type,
          department: w.department,
          cost: w.total_cost,
          reason: w.reason,
        })),
      });
    },
  ),
];
