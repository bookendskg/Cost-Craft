// The MCP tool catalogue — what an AI assistant can do in KostKraft.
//
// Every write goes through the app's own repositories, so an assistant's change
// gets the same treatment as one made in the browser: unit conversion, the recipe
// cost cascade, price history, the Activity Log entry, and the snapshot a Super
// Admin needs to revert it. Nothing here talks to the database directly.
//
// Permissions are the user's own: the server acts as them, so row-level security
// and their KostKraft role decide what an assistant may do.

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
import { previewMaterials, previewYields } from "@/lib/import/previewPlan";
import type { ParsedRow } from "@/lib/import/importTypes";
import type { ImportYieldRow } from "@/lib/data/mock/yields";
import { CATALOG_TOOLS } from "./catalogTools.js";
import {
  INGREDIENT_EDITORS,
  YIELD_EDITORS,
  actor,
  cutLabelImpact,
  defineTool,
  fail,
  findMaterial,
  findRecipe,
  materialInput,
  materialView,
  norm,
  requireRole,
  resolveMaterial,
  resolveYield,
  text,
  type ToolDef,
} from "./toolkit.js";

export { setActor, currentActor } from "./toolkit.js";
export type { Actor, ToolDef, ToolResult } from "./toolkit.js";

/** The core catalogue: ingredients, recipes (read), yields, packaging (read), activity. */
const CORE_TOOLS: ToolDef[] = [
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
      const denied = requireRole(INGREDIENT_EDITORS, "change ingredient prices");
      if (denied) return fail(denied);
      const found = await resolveMaterial(ingredient);
      if ("error" in found) return fail(found.error);
      const m = found.material;
      const updated = await materialsRepo.update(
        m.id,
        {
          ingredient_name: m.ingredient_name,
          category: m.category,
          notes: m.notes,
          purchase_price: price,
          purchase_quantity: m.purchase_quantity,
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
      const denied = requireRole(INGREDIENT_EDITORS, "create raw materials");
      if (denied) return fail(denied);
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
    "update_ingredient",
    {
      title: "Update an ingredient",
      description:
        "Rename a raw material, or change its category, unit, price or notes. Only the fields you pass change. A rename can orphan the cut/prep label on recipe lines — the reply lists any that break.",
      inputSchema: {
        ingredient: z.string().describe("Current ingredient name or id"),
        name: z.string().optional().describe("New name"),
        category: z.string().optional(),
        measurement: z
          .enum(["weight", "liquid", "count"])
          .optional()
          .describe("Changes the unit: weight → per 1 kg, liquid → per 1 litre, count → per 1 piece"),
        price: z.number().min(0).nullable().optional().describe("Price per 1 kg / 1 litre / 1 piece"),
        notes: z.string().nullable().optional(),
      },
    },
    async ({ ingredient, name, category, measurement, price, notes }) => {
      const denied = requireRole(INGREDIENT_EDITORS, "edit raw materials");
      if (denied) return fail(denied);
      if (name === undefined && category === undefined && measurement === undefined && price === undefined && notes === undefined) {
        return fail("Nothing to change — pass at least one of name, category, measurement, price or notes.");
      }
      const found = await resolveMaterial(ingredient);
      if ("error" in found) return fail(found.error);
      const m = found.material;
      const renamed = !!name && norm(name) !== norm(m.ingredient_name);
      // Snapshot what we need: the repos hand back live rows, so `m` changes under us.
      const was = { name: m.ingredient_name, category: m.category, price: m.purchase_price, per: `1 ${m.purchase_unit}` };
      const before = { id: m.id, ingredient_name: m.ingredient_name };
      const yields = (await yieldsRepo.listForIngredient(m.id)).map((y) => ({ ...y }));
      // materialInput() owns the unit conventions; only consult it for a unit change.
      const units = measurement ? materialInput(m.ingredient_name, m.category, measurement, null) : null;
      let updated;
      try {
        updated = await materialsRepo.update(
          m.id,
          {
            ingredient_name: name?.trim() || m.ingredient_name,
            category: category?.trim() || m.category,
            notes: notes === undefined ? m.notes : notes,
            purchase_price: price === undefined ? m.purchase_price : price,
            purchase_quantity: units ? 1 : m.purchase_quantity,
            purchase_unit: units?.purchase_unit ?? m.purchase_unit,
            base_unit: units?.base_unit ?? m.base_unit,
          },
          actor.userId,
        );
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Could not update that ingredient.");
      }
      const broken = renamed ? await cutLabelImpact({ material: before, yields }, { material: updated, yields }) : [];
      return text({
        updated: materialView(updated),
        was,
        ...(broken.length
          ? {
              warning: `${broken.length} recipe line(s) name a cut/prep that no longer exists after the rename, so they now cost without the yield adjustment. Re-pick the cut on each.`,
              cut_labels_affected: broken,
            }
          : {}),
        note: "Recipe costs were recalculated. A Super Admin can revert this from the Activity Log.",
      });
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
      const denied = requireRole(YIELD_EDITORS, "manage yields");
      if (denied) return fail(denied);
      const found = await resolveMaterial(ingredient);
      if ("error" in found) return fail(found.error);
      const m = found.material;
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
    "update_yield",
    {
      title: "Update a yield record",
      description:
        "Correct or rename one of an ingredient's yield records. Only the fields you pass change. The record's name decides the cut/prep label recipes pick, so a rename can orphan recipe lines — the reply lists any that break.",
      inputSchema: {
        ingredient: z.string().describe("Ingredient name or id"),
        yield_record: z
          .string()
          .optional()
          .describe('Which record: its name ("Chopped Onion"), its effective date or its id. Optional when the ingredient has only one.'),
        name: z.string().optional().describe("New preparation name"),
        purchase_cost: z.number().positive().optional().describe("Cost of 1 kg / 1 litre / 1 piece"),
        wastage_quantity: z.number().optional().describe("Lost (positive) or gained (negative) in the base unit"),
        effective_from: z.string().optional().describe("YYYY-MM-DD"),
        notes: z.string().nullable().optional(),
      },
    },
    async ({ ingredient, yield_record, name, purchase_cost, wastage_quantity, effective_from, notes }) => {
      const denied = requireRole(YIELD_EDITORS, "manage yields");
      if (denied) return fail(denied);
      if (name === undefined && purchase_cost === undefined && wastage_quantity === undefined && effective_from === undefined && notes === undefined) {
        return fail("Nothing to change — pass at least one of name, purchase_cost, wastage_quantity, effective_from or notes.");
      }
      const found = await resolveMaterial(ingredient);
      if ("error" in found) return fail(found.error);
      const m = found.material;
      const rows = await yieldsRepo.listForIngredient(m.id);
      const picked = resolveYield(rows, m.ingredient_name, yield_record);
      if ("error" in picked) return fail(picked.error);
      const y = picked.record;
      const renamed = name !== undefined && norm(name) !== norm(y.name ?? "");
      // Snapshot first: the repos hand back live rows, so `y` and `rows` change under us.
      const was = {
        name: y.name,
        yield_pct: y.yield_percentage,
        wastage_qty: y.wastage_quantity,
        effective_from: y.effective_from,
      };
      const before = rows.map((r) => ({ ...r }));
      // update() replaces the whole record, so everything not passed is carried over.
      let updated;
      try {
        updated = await yieldsRepo.update(
          y.id,
          {
            name: name === undefined ? y.name : name,
            ingredient_id: y.ingredient_id,
            purchase_cost: purchase_cost ?? y.purchase_cost,
            purchase_quantity: y.purchase_quantity,
            purchase_unit: y.purchase_unit,
            wastage_quantity: wastage_quantity ?? y.wastage_quantity,
            wastage_unit: y.wastage_unit,
            effective_from: effective_from ?? y.effective_from,
            notes: notes === undefined ? y.notes : notes,
          },
          actor.userId,
        );
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Could not update that yield record.");
      }
      const broken = renamed
        ? await cutLabelImpact(
            { material: m, yields: before },
            { material: m, yields: before.map((r) => (r.id === updated.id ? { ...updated } : r)) },
          )
        : [];
      return text({
        updated: {
          id: updated.id,
          name: updated.name,
          ingredient: m.ingredient_name,
          yield_pct: updated.yield_percentage,
          wastage_qty: updated.wastage_quantity,
          usable: updated.usable_quantity,
          effective_from: updated.effective_from,
        },
        was,
        ...(broken.length
          ? {
              warning: `${broken.length} recipe line(s) name a cut/prep that no longer exists after the rename, so they now cost without the yield adjustment. Re-pick the cut on each.`,
              cut_labels_affected: broken,
            }
          : {}),
        note: "Recipes using this ingredient were re-costed. A Super Admin can revert this from the Activity Log.",
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

/**
 * Every tool this server exposes, in the order an assistant should meet them:
 * reading and pricing first, then the catalogue-editing tools.
 */
export const TOOLS: ToolDef[] = [...CORE_TOOLS, ...CATALOG_TOOLS];
