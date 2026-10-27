// Shared building blocks for the MCP tools: the ToolDef shape, who the request
// acts as, and the lookup/formatting helpers every tool uses.
//
// Every write goes through the app's own repositories, so an agent's change gets
// the same treatment as one made in the browser: unit conversion, the recipe cost
// cascade, price history, the Activity Log entry, and the snapshots a Super Admin
// needs to revert it. Nothing here talks to the database directly.
//
// Permissions are Supabase's: the server signs in as the user, so row-level
// security and their KostKraft role decide what the agent can do.

import { z } from "zod";

import { materialsRepo, recipesRepo, type MaterialInput } from "@/lib/data";
import { canonicalPurchase, type MeasurementType } from "@/lib/units";
import { cutYieldFor } from "@/lib/data/ingredientCuts";
import type { IngredientYield, RawMaterial, Recipe } from "@/lib/data/types";

/** One tool, shared by both transports: stdio (Claude Code) and hosted HTTP (ChatGPT). */
export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: S;
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<ToolResult>;
}

export interface ToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export function defineTool<S extends z.ZodRawShape>(
  name: string,
  meta: { title: string; description: string; inputSchema: S },
  handler: (args: z.objectOutputType<S, z.ZodTypeAny>) => Promise<ToolResult>,
): ToolDef {
  return { name, ...meta, handler } as unknown as ToolDef;
}

/** Who the current request acts as. Set once per stdio session, per request when hosted. */
export interface Actor {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export let actor: Actor;

export function setActor(next: Actor): void {
  actor = next;
}

export function currentActor(): Actor {
  return actor;
}

export const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
export const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

export const norm = (s: string) => s.trim().toLowerCase();

// ── Who may write what ───────────────────────────────────────────────────────
// These mirror the capability matrix in src/lib/auth/permissions.ts. The database
// has the final say through RLS; refusing here just turns a policy error into a
// sentence the assistant can act on.

/** Edits the catalogue — mirrors can_edit_recipes() and the yield.manage capability. */
export const CATALOG_EDITORS = ["super_admin", "admin", "editor", "head_chef"];
/** Raw materials and their prices — material.edit, which head chefs do NOT hold. */
export const INGREDIENT_EDITORS = ["super_admin", "admin", "editor"];
/** Yield records — yield.manage, which head chefs do hold. */
export const YIELD_EDITORS = CATALOG_EDITORS;

export function requireRole(allowed: string[], what: string): string | null {
  if (allowed.includes(actor.role)) return null;
  return `Your role (${actor.role}) can't ${what}. Ask an Admin.`;
}

export async function findMaterial(nameOrId: string): Promise<RawMaterial | null> {
  const all = await materialsRepo.list();
  return (
    all.find((m) => m.id === nameOrId) ??
    all.find((m) => norm(m.ingredient_name) === norm(nameOrId)) ??
    all.find((m) => norm(m.ingredient_name).includes(norm(nameOrId))) ??
    null
  );
}

export async function findRecipe(nameOrId: string): Promise<Recipe | null> {
  const all = await recipesRepo.list();
  return (
    all.find((r) => r.id === nameOrId) ??
    all.find((r) => norm(r.recipe_name) === norm(nameOrId)) ??
    all.find((r) => norm(r.recipe_name).includes(norm(nameOrId))) ??
    null
  );
}

/**
 * findMaterial, but refusing an ambiguous partial name instead of silently taking
 * the first match — "Onion" must not quietly resolve to "Spring Onion" when the
 * next step renames or re-prices it.
 */
export async function resolveMaterial(
  nameOrId: string,
): Promise<{ material: RawMaterial } | { error: string }> {
  const all = await materialsRepo.list();
  const exact =
    all.find((m) => m.id === nameOrId) ?? all.find((m) => norm(m.ingredient_name) === norm(nameOrId));
  if (exact) return { material: exact };
  const partial = all.filter((m) => norm(m.ingredient_name).includes(norm(nameOrId)));
  if (partial.length === 1) return { material: partial[0] };
  if (partial.length > 1) {
    const names = partial.slice(0, 8).map((m) => `"${m.ingredient_name}"`).join(", ");
    return {
      error: `"${nameOrId}" matches ${partial.length} ingredients (${names}). Use the exact name.`,
    };
  }
  return { error: `No ingredient matches "${nameOrId}".` };
}

/**
 * One of an ingredient's yield records, by id, record name or effective date.
 * With no selector it only resolves when the ingredient has exactly one record,
 * so an edit can't land on the wrong preparation.
 */
export function resolveYield(
  rows: IngredientYield[],
  ingredientName: string,
  selector?: string,
): { record: IngredientYield } | { error: string } {
  const describe = () =>
    rows
      .slice(0, 8)
      .map((y) => `"${y.name || ingredientName}" (${y.effective_from})`)
      .join(", ");
  if (!rows.length) return { error: `${ingredientName} has no yield records yet. Use create_yield.` };
  if (!selector) {
    if (rows.length === 1) return { record: rows[0] };
    return { error: `${ingredientName} has ${rows.length} yield records (${describe()}). Say which one.` };
  }
  const byId = rows.find((y) => y.id === selector);
  if (byId) return { record: byId };
  const exact = rows.filter((y) => norm(y.name ?? "") === norm(selector) || y.effective_from === selector);
  if (exact.length === 1) return { record: exact[0] };
  if (exact.length > 1) return { error: `${exact.length} yield records match "${selector}" (${describe()}). Use its id.` };
  const partial = rows.filter((y) => norm(y.name ?? "").includes(norm(selector)));
  if (partial.length === 1) return { record: partial[0] };
  if (partial.length > 1) return { error: `"${selector}" matches ${partial.length} yield records (${describe()}). Use the exact name.` };
  return { error: `No yield record of ${ingredientName} matches "${selector}". It has: ${describe()}.` };
}

/**
 * Recipe lines whose "cut / prep" choice stops resolving after a rename.
 *
 * A line stores the cut as a LABEL ("Chopped"), and the labels are derived from the
 * yield record's name minus the ingredient's name — so renaming either side can
 * leave a line pointing at a label that no longer exists, and it quietly re-costs
 * without the yield adjustment. Nothing is repaired here; the tools report it.
 */
export async function cutLabelImpact(
  before: { material: Pick<RawMaterial, "id" | "ingredient_name">; yields: IngredientYield[] },
  after: { material: Pick<RawMaterial, "id" | "ingredient_name">; yields: IngredientYield[] },
): Promise<{ recipe: string; cut: string }[]> {
  const [lines, recipes] = await Promise.all([recipesRepo.allIngredients(), recipesRepo.list()]);
  const nameById = new Map(recipes.map((r) => [r.id, r.recipe_name]));
  const broken: { recipe: string; cut: string }[] = [];
  for (const line of lines) {
    if (line.component_type === "recipe" || line.ingredient_id !== before.material.id || !line.cut_type) continue;
    const had = cutYieldFor(before.material, line.cut_type, before.yields);
    const has = cutYieldFor(after.material, line.cut_type, after.yields);
    if (had !== null && has === null) {
      broken.push({ recipe: nameById.get(line.recipe_id) ?? line.recipe_id, cut: line.cut_type });
    }
  }
  return broken;
}

export const materialView = (m: RawMaterial) => ({
  id: m.id,
  name: m.ingredient_name,
  category: m.category,
  price: m.purchase_price,
  per: `1 ${m.purchase_unit}`,
  cost_per_base_unit: m.cost_per_base_unit,
  base_unit: m.base_unit,
  status: m.status,
  last_price_update: m.last_price_update,
});

export const MEASUREMENT: Record<string, MeasurementType> = {
  weight: "weight",
  kg: "weight",
  liquid: "volume",
  volume: "volume",
  litre: "volume",
  count: "count",
  piece: "count",
};

export function materialInput(
  name: string,
  category: string,
  type: string,
  price: number | null,
): MaterialInput {
  const measurement = MEASUREMENT[norm(type)] ?? "weight";
  const canon = canonicalPurchase(measurement);
  return {
    ingredient_name: name.trim(),
    category: category.trim() || "Other",
    notes: null,
    purchase_price: price,
    purchase_quantity: 1,
    purchase_unit: canon.purchase_unit,
    base_unit: canon.base_unit,
  };
}

