// KostKraft MCP server — lets an AI agent read and update the costing data as the
// person running it.
//
// Every write goes through the app's own repositories, so an agent's change gets
// the same treatment as one made in the browser: unit conversion, the recipe cost
// cascade, price history, the Activity Log entry, and the snapshots a Super Admin
// needs to revert it. Nothing here talks to the database directly.
//
// Permissions are Supabase's: the server signs in as the user, so row-level
// security and their KostKraft role decide what the agent can do.

import { z } from "zod";

import {
  auditRepo,
  materialsRepo,
  packagingRepo,
  recipesRepo,
  revertRepo,
  yieldsRepo,
  type MaterialInput,
} from "@/lib/data";
import { canonicalPurchase, type MeasurementType } from "@/lib/units";
import { previewMaterials, previewYields } from "@/lib/import/previewPlan";
import type { ParsedRow } from "@/lib/import/importTypes";
import type { ImportYieldRow } from "@/lib/data/mock/yields";
import type { RawMaterial, Recipe } from "@/lib/data/types";

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

function defineTool<S extends z.ZodRawShape>(
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

let actor: Actor;

export function setActor(next: Actor): void {
  actor = next;
}

export function currentActor(): Actor {
  return actor;
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});
const fail = (message: string) => ({
  content: [{ type: "text" as const, text: message }],
  isError: true,
});

const norm = (s: string) => s.trim().toLowerCase();

async function findMaterial(nameOrId: string): Promise<RawMaterial | null> {
  const all = await materialsRepo.list();
  return (
    all.find((m) => m.id === nameOrId) ??
    all.find((m) => norm(m.ingredient_name) === norm(nameOrId)) ??
    all.find((m) => norm(m.ingredient_name).includes(norm(nameOrId))) ??
    null
  );
}

async function findRecipe(nameOrId: string): Promise<Recipe | null> {
  const all = await recipesRepo.list();
  return (
    all.find((r) => r.id === nameOrId) ??
    all.find((r) => norm(r.recipe_name) === norm(nameOrId)) ??
    all.find((r) => norm(r.recipe_name).includes(norm(nameOrId))) ??
    null
  );
}

const materialView = (m: RawMaterial) => ({
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

const MEASUREMENT: Record<string, MeasurementType> = {
  weight: "weight",
  kg: "weight",
  liquid: "volume",
  volume: "volume",
  litre: "volume",
  count: "count",
  piece: "count",
};

function materialInput(
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

/** Every tool this server exposes. */
export const TOOLS: ToolDef[] = [
  defineTool(
    "whoami",
    {
      title: "Who am I",
      description:
        "The KostKraft account this server acts as. Every change is recorded against this person, and their role decides what is allowed.",
      inputSchema: {},
    },
    async () => text({ name: actor.name, email: actor.email, role: actor.role, id: actor.userId }),
  ),
  defineTool(
    "list_ingredients",
    {
      title: "List ingredients",
      description: "Raw materials with their purchase prices. Optionally filter by name or category.",
      inputSchema: {
        search: z.string().optional().describe("Match on ingredient name"),
        category: z.string().optional(),
        missing_price_only: z.boolean().optional().describe("Only ingredients with no price yet"),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async ({ search, category, missing_price_only, limit }) => {
      let rows = await materialsRepo.list();
      if (search) rows = rows.filter((m) => norm(m.ingredient_name).includes(norm(search)));
      if (category) rows = rows.filter((m) => norm(m.category) === norm(category));
      if (missing_price_only) rows = rows.filter((m) => m.purchase_price == null);
      return text({ total: rows.length, ingredients: rows.slice(0, limit ?? 100).map(materialView) });
    },
  ),
  defineTool(
    "get_ingredient",
    {
      title: "Get one ingredient",
      description: "One raw material with its price, unit, yields and recent price changes.",
      inputSchema: { ingredient: z.string().describe("Ingredient name or id") },
    },
    async ({ ingredient }) => {
      const m = await findMaterial(ingredient);
      if (!m) return fail(`No ingredient matches "${ingredient}".`);
      const [yields, history] = await Promise.all([
        yieldsRepo.listForIngredient(m.id),
        materialsRepo.priceHistory(m.id),
      ]);
      return text({
        ...materialView(m),
        yields: yields.map((y) => ({ id: y.id, name: y.name, yield_pct: y.yield_percentage })),
        price_history: history.slice(0, 5).map((h) => ({
          at: h.changed_at,
          from: h.old_price,
          to: h.new_price,
        })),
      });
    },
  ),
  defineTool(
    "update_ingredient_price",
    {
      title: "Update an ingredient price",
      description:
        "Set a raw material's purchase price (per 1 kg / 1 litre / 1 piece). Recipe costs recalculate, and the change is logged and revertible.",
      inputSchema: {
        ingredient: z.string().describe("Ingredient name or id"),
        price: z.number().min(0).describe("Price per 1 kg / 1 litre / 1 piece"),
      },
    },
    async ({ ingredient, price }) => {
      const m = await findMaterial(ingredient);
      if (!m) return fail(`No ingredient matches "${ingredient}".`);
      const updated = await materialsRepo.update(
        m.id,
        {
          ingredient_name: m.ingredient_name,
          category: m.category,
          notes: m.notes,
          purchase_price: price,
          purchase_quantity: 1,
          purchase_unit: m.purchase_unit,
          base_unit: m.base_unit,
        },
        actor.userId,
      );
      return text({
        updated: materialView(updated),
        was: m.purchase_price,
        note: "Recipe costs were recalculated. A Super Admin can revert this from the Activity Log.",
      });
    },
  ),
  defineTool(
    "create_ingredient",
    {
      title: "Create an ingredient",
      description: "Add a raw material. Measurement decides the unit: weight → per 1 kg, liquid → per 1 litre, count → per 1 piece.",
      inputSchema: {
        name: z.string(),
        category: z.string().optional(),
        measurement: z.enum(["weight", "liquid", "count"]).default("weight"),
        price: z.number().min(0).nullable().optional(),
      },
    },
    async ({ name, category, measurement, price }) => {
      const existing = await findMaterial(name);
      if (existing && norm(existing.ingredient_name) === norm(name)) {
        return fail(`"${name}" already exists — use update_ingredient_price instead.`);
      }
      const created = await materialsRepo.create(
        materialInput(name, category ?? "Other", measurement, price ?? null),
        actor.userId,
      );
      return text({ created: materialView(created) });
    },
  ),
  defineTool(
    "list_recipes",
    {
      title: "List recipes",
      description: "Menu recipes and in-house preps with their costs.",
      inputSchema: {
        search: z.string().optional(),
        preps_only: z.boolean().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async ({ search, preps_only, limit }) => {
      let rows = await recipesRepo.list();
      if (search) rows = rows.filter((r) => norm(r.recipe_name).includes(norm(search)));
      if (preps_only !== undefined) rows = rows.filter((r) => !!r.is_prep === preps_only);
      return text({
        total: rows.length,
        recipes: rows.slice(0, limit ?? 100).map((r) => ({
          id: r.id,
          name: r.recipe_name,
          category: r.category,
          size: r.size_label,
          is_prep: r.is_prep,
          status: r.status,
          total_cost: r.total_cost,
          cost_per_portion: r.cost_per_portion,
          selling_price: r.selling_price,
        })),
      });
    },
  ),
  defineTool(
    "get_recipe",
    {
      title: "Get one recipe",
      description: "A recipe with its ingredient lines, quantities and line costs.",
      inputSchema: { recipe: z.string().describe("Recipe name or id") },
    },
    async ({ recipe }) => {
      const found = await findRecipe(recipe);
      if (!found) return fail(`No recipe matches "${recipe}".`);
      const full = await recipesRepo.getWithIngredients(found.id);
      if (!full) return fail("Recipe could not be loaded.");
      return text({
        id: full.recipe.id,
        name: full.recipe.recipe_name,
        category: full.recipe.category,
        status: full.recipe.status,
        total_cost: full.recipe.total_cost,
        cost_per_portion: full.recipe.cost_per_portion,
        selling_price: full.recipe.selling_price,
        ingredients: full.ingredients.map((i) => ({
          name: i.material?.ingredient_name ?? i.subRecipe?.recipe_name ?? i.ingredient_id,
          is_sub_recipe: i.component_type === "recipe",
          quantity: i.quantity_used,
          unit: i.unit_used,
          cut: i.cut_type,
          line_cost: i.calculated_cost,
        })),
      });
    },
  ),
  defineTool(
    "list_yields",
    {
      title: "List yields",
      description: "Yield records (wastage → usable quantity) per ingredient preparation.",
      inputSchema: { ingredient: z.string().optional(), limit: z.number().int().min(1).max(500).optional() },
    },
    async ({ ingredient, limit }) => {
      const materials = await materialsRepo.list();
      const byId = new Map(materials.map((m) => [m.id, m.ingredient_name]));
      let rows = await yieldsRepo.list();
      if (ingredient) {
        const m = await findMaterial(ingredient);
        if (!m) return fail(`No ingredient matches "${ingredient}".`);
        rows = rows.filter((y) => y.ingredient_id === m.id);
      }
      return text({
        total: rows.length,
        yields: rows.slice(0, limit ?? 100).map((y) => ({
          id: y.id,
          name: y.name,
          ingredient: byId.get(y.ingredient_id) ?? y.ingredient_id,
          yield_pct: y.yield_percentage,
          wastage_qty: y.wastage_quantity,
          effective_from: y.effective_from,
        })),
      });
    },
  ),
  defineTool(
    "create_yield",
    {
      title: "Create a yield record",
      description:
        "Record a preparation's yield. Wastage is in the base unit (grams for kg-priced items); a NEGATIVE wastage means cooking ADDS weight, e.g. boiled rice.",
      inputSchema: {
        ingredient: z.string(),
        name: z.string().describe('Preparation name, e.g. "Chopped Onion"'),
        purchase_cost: z.number().positive().describe("Cost of 1 kg / 1 litre / 1 piece"),
        wastage_quantity: z.number().describe("Lost (positive) or gained (negative) in the base unit"),
        effective_from: z.string().optional().describe("YYYY-MM-DD, defaults to today"),
      },
    },
    async ({ ingredient, name, purchase_cost, wastage_quantity, effective_from }) => {
      const m = await findMaterial(ingredient);
      if (!m) return fail(`No ingredient matches "${ingredient}".`);
      const created = await yieldsRepo.create(
        {
          name,
          ingredient_id: m.id,
          purchase_cost,
          purchase_quantity: 1,
          purchase_unit: m.purchase_unit,
          wastage_quantity,
          wastage_unit: m.base_unit,
          effective_from: effective_from ?? undefined,
        },
        actor.userId,
      );
      return text({
        created: {
          id: created.id,
          name: created.name,
          yield_pct: created.yield_percentage,
          usable: created.usable_quantity,
        },
      });
    },
  ),
  defineTool(
    "list_packaging",
    {
      title: "List packaging",
      description: "Packaging items with their unit prices.",
      inputSchema: { search: z.string().optional() },
    },
    async ({ search }) => {
      let rows = await packagingRepo.list();
      if (search) rows = rows.filter((p) => norm(p.name).includes(norm(search)));
      return text({
        total: rows.length,
        packaging: rows.map((p) => ({ id: p.id, name: p.name, type: p.packaging_type, unit: p.unit, price: p.unit_price })),
      });
    },
  ),
  defineTool(
    "preview_ingredient_import",
    {
      title: "Preview an ingredient import",
      description:
        "Dry run: shows what a batch of ingredients WOULD do (new / update / unchanged) without writing anything. Always run this before apply_ingredient_import.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              name: z.string(),
              category: z.string().optional(),
              measurement: z.enum(["weight", "liquid", "count"]).optional(),
              price: z.number().min(0).nullable().optional(),
            }),
          )
          .min(1)
          .max(500),
        mode: z.enum(["upsert", "add", "update"]).default("upsert"),
      },
    },
    async ({ rows, mode }) => {
      const parsed: ParsedRow<MaterialInput>[] = rows.map((r, i) => ({
        row: i + 1,
        value: materialInput(r.name, r.category ?? "Other", r.measurement ?? "weight", r.price ?? null),
      }));
      const preview = previewMaterials(mode, parsed, await materialsRepo.list());
      return text({
        counts: preview.counts,
        warnings: preview.warnings,
        rows: preview.rows.map((r) => ({ row: r.row, status: r.status, item: r.label, note: r.message })),
        next: "If this is right, call apply_ingredient_import with the same rows and confirm: true.",
      });
    },
  ),
  defineTool(
    "apply_ingredient_import",
    {
      title: "Apply an ingredient import",
      description:
        "Write a batch of ingredients. Requires confirm: true, and the whole batch is reverted in one click from the Activity Log if it goes wrong.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              name: z.string(),
              category: z.string().optional(),
              measurement: z.enum(["weight", "liquid", "count"]).optional(),
              price: z.number().min(0).nullable().optional(),
            }),
          )
          .min(1)
          .max(500),
        mode: z.enum(["upsert", "add", "update"]).default("upsert"),
        confirm: z.boolean().describe("Must be true — run preview_ingredient_import first"),
      },
    },
    async ({ rows, mode, confirm }) => {
      if (!confirm) return fail("Not applied. Run preview_ingredient_import, show the user, then pass confirm: true.");
      const inputs = rows.map((r) =>
        materialInput(r.name, r.category ?? "Other", r.measurement ?? "weight", r.price ?? null),
      );
      const summary = await materialsRepo.importMaterials(mode, inputs, actor.userId);
      return text({ summary, note: "Logged as one batch — a Super Admin can revert it all from the Activity Log." });
    },
  ),
  defineTool(
    "preview_yield_import",
    {
      title: "Preview a yield import",
      description: "Dry run for a batch of yield records: what would be added, updated or rejected.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              ingredient: z.string(),
              name: z.string().optional(),
              purchase_cost: z.number().positive(),
              wastage_quantity: z.number(),
              effective_from: z.string().optional(),
            }),
          )
          .min(1)
          .max(500),
        mode: z.enum(["upsert", "add", "update"]).default("upsert"),
      },
    },
    async ({ rows, mode }) => {
      const materials = await materialsRepo.list();
      const parsed: ParsedRow<ImportYieldRow>[] = rows.map((r, i) => {
        const m = materials.find((x) => norm(x.ingredient_name) === norm(r.ingredient));
        return {
          row: i + 1,
          value: {
            ingredient_name: r.ingredient,
            name: r.name ?? null,
            purchase_cost: r.purchase_cost,
            purchase_quantity: 1,
            purchase_unit: m?.purchase_unit ?? "KG",
            wastage_quantity: r.wastage_quantity,
            effective_from: r.effective_from ?? null,
            notes: null,
          },
        };
      });
      const preview = previewYields(mode, parsed, materials, await yieldsRepo.list());
      return text({
        counts: preview.counts,
        warnings: preview.warnings,
        rows: preview.rows.map((r) => ({ row: r.row, status: r.status, item: r.label, note: r.message })),
        next: "If this is right, call apply_yield_import with the same rows and confirm: true.",
      });
    },
  ),
  defineTool(
    "apply_yield_import",
    {
      title: "Apply a yield import",
      description: "Write a batch of yield records. Requires confirm: true.",
      inputSchema: {
        rows: z
          .array(
            z.object({
              ingredient: z.string(),
              name: z.string().optional(),
              purchase_cost: z.number().positive(),
              wastage_quantity: z.number(),
              effective_from: z.string().optional(),
            }),
          )
          .min(1)
          .max(500),
        mode: z.enum(["upsert", "add", "update"]).default("upsert"),
        confirm: z.boolean(),
      },
    },
    async ({ rows, mode, confirm }) => {
      if (!confirm) return fail("Not applied. Run preview_yield_import, show the user, then pass confirm: true.");
      const materials = await materialsRepo.list();
      const inputs: ImportYieldRow[] = rows.map((r) => {
        const m = materials.find((x) => norm(x.ingredient_name) === norm(r.ingredient));
        return {
          ingredient_name: r.ingredient,
          name: r.name ?? null,
          purchase_cost: r.purchase_cost,
          purchase_quantity: 1,
          purchase_unit: m?.purchase_unit ?? "KG",
          wastage_quantity: r.wastage_quantity,
          effective_from: r.effective_from ?? null,
          notes: null,
        };
      });
      const summary = await yieldsRepo.importYields(mode, inputs, actor.userId);
      return text({ summary });
    },
  ),
  defineTool(
    "list_activity",
    {
      title: "List recent activity",
      description:
        "Recent changes with who made them. Super Admins only — anyone else gets an empty list, enforced by the database.",
      inputSchema: {
        entity_type: z
          .enum(["ingredient", "recipe", "yield", "wastage", "user", "packaging", "settings", "session"])
          .optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async ({ entity_type, search, limit }) => {
      const page = await auditRepo.list({ entityType: entity_type, search, pageSize: limit ?? 25, page: 1 });
      return text({
        total: page.total,
        entries: page.rows.map((r) => ({
          id: r.id,
          at: r.performed_at,
          who: r.actor_name ?? r.performed_by,
          action: r.action,
          type: r.entity_type,
          what: r.notes,
          batch_id: r.batch_id,
        })),
      });
    },
  ),
  defineTool(
    "revert_change",
    {
      title: "Revert a change",
      description:
        "Undo a logged change (or a whole import batch), restoring the record as it was. Super Admins only. If the record changed again since, it refuses once — pass force: true to override.",
      inputSchema: {
        entry_id: z.string().optional().describe("Activity Log entry id"),
        batch_id: z.string().optional().describe("Revert every change of one import/bulk action"),
        force: z.boolean().optional(),
      },
    },
    async ({ entry_id, batch_id, force }) => {
      if (!entry_id && !batch_id) return fail("Pass entry_id or batch_id (see list_activity).");
      const result = batch_id
        ? await revertRepo.revertBatch(batch_id, actor.userId, force ?? false)
        : await revertRepo.revert(entry_id!, actor.userId, force ?? false);
      return result.ok ? text(result) : fail(result.message);
    },
  ),
];
