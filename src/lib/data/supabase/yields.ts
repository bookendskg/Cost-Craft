// Supabase-backed ingredient-yields repository (Phase 2). Mirrors the mock
// `yieldsRepo` interface 1:1 so feature code is unchanged — selection happens in
// src/lib/data/index.ts by whether Supabase is configured. Backed by the
// `public.ingredient_yields` table (db/migrations/0005 + 0008 RLS).
//
// Derived fields (usable qty, %s, adjusted unit cost) are computed by the SAME
// pure engine the mock uses (src/lib/yield.ts → computeYield); we do NOT
// re-derive cost math here. After any write, recipe costs that depend on the
// affected ingredient are recomputed + persisted via cascadeMaterial().

import type { IngredientYield } from "../types";
import type { ImportSummary } from "../../import/importTypes";
import { computeYield } from "../../yield";
import { getUnitFamily } from "../../units";
import { DUPLICATE_MSG, normalizeYieldName, type YieldInput, type ImportYieldRow } from "../mock/yields";
import { sb, fail, cascadeMaterial, audit } from "./helpers";
import { captureEntity } from "./snapshot";
import { newBatchId } from "../batch";

/** Today as an ISO date (YYYY-MM-DD) — matches the mock's todayISO(). */
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Base unit label for the purchase unit's family. */
function baseUnitLabel(unit: string): string {
  const fam = getUnitFamily(unit);
  return fam === "weight" ? "Gram" : fam === "volume" ? "ML" : unit;
}

/** Derive the full stored yield record from raw inputs (reuses computeYield). */
function derive(input: YieldInput): Omit<IngredientYield, "id" | "created_at" | "updated_at" | "created_by"> {
  const r = computeYield({
    purchaseCost: input.purchase_cost,
    purchaseQuantity: input.purchase_quantity,
    purchaseUnit: input.purchase_unit,
    wastageQty: input.wastage_quantity,
  });
  return {
    name: input.name?.trim() || null,
    ingredient_id: input.ingredient_id,
    purchase_cost: input.purchase_cost,
    purchase_quantity: input.purchase_quantity,
    purchase_unit: input.purchase_unit,
    raw_quantity: r.rawQtyBase,
    raw_unit: baseUnitLabel(input.purchase_unit),
    wastage_quantity: input.wastage_quantity,
    wastage_unit: input.wastage_unit || baseUnitLabel(input.purchase_unit),
    usable_quantity: r.usableQty,
    wastage_percentage: r.wastagePct,
    yield_percentage: r.yieldPct,
    original_unit_cost: r.originalUnitCost,
    yield_adjusted_unit_cost: r.yieldAdjustedUnitCost,
    effective_from: input.effective_from ?? todayISO(),
    notes: input.notes ?? null,
  };
}

/** Existing record with the same ingredient + prep name + effective date, if any.
 *  Names are compared case/space-insensitively, matching the DB's unique index. */
async function findDuplicate(
  input: YieldInput,
  eff: string,
  ignoreId?: string,
): Promise<{ id: string } | null> {
  const { data, error } = await sb()
    .from("ingredient_yields")
    .select("id, name")
    .eq("ingredient_id", input.ingredient_id)
    .eq("effective_from", eff);
  if (error) fail("Check yield", error.message);
  const key = normalizeYieldName(input.name);
  const hit = (data ?? []).find(
    (r: { id: string; name: string | null }) => r.id !== ignoreId && normalizeYieldName(r.name) === key,
  );
  return hit ? { id: hit.id } : null;
}

export const supabaseYieldsRepo = {
  async list(): Promise<IngredientYield[]> {
    const { data, error } = await sb().from("ingredient_yields").select("*");
    if (error) fail("Load yields", error.message);
    return (data ?? []) as IngredientYield[];
  },

  async getById(id: string): Promise<IngredientYield | null> {
    const { data, error } = await sb()
      .from("ingredient_yields")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail("Load yield", error.message);
    return (data ?? null) as IngredientYield | null;
  },

  async listForIngredient(ingredientId: string): Promise<IngredientYield[]> {
    const { data, error } = await sb()
      .from("ingredient_yields")
      .select("*")
      .eq("ingredient_id", ingredientId)
      .order("effective_from", { ascending: false });
    if (error) fail("Load yields for ingredient", error.message);
    return (data ?? []) as IngredientYield[];
  },

  async create(input: YieldInput, actorId: string): Promise<IngredientYield> {
    const c = sb();
    const eff = input.effective_from ?? todayISO();
    // Mirror the mock's friendly duplicate guard (the table's unique index on
    // ingredient + prep name + date is the real enforcement).
    if (await findDuplicate(input, eff)) fail("Create yield", DUPLICATE_MSG);

    const { data, error } = await c
      .from("ingredient_yields")
      .insert({ ...derive({ ...input, effective_from: eff }), created_by: actorId })
      .select("*")
      .single();
    if (error) fail("Create yield", error.message);
    const row = data as IngredientYield;

    await audit({
      entity_type: "yield",
      // The yield ROW id (not the ingredient's) — an ingredient can hold several
      // preps, so the ingredient id could not identify which record changed.
      entity_id: row.id,
      action: "create",
      new_values: { yield_pct: row.yield_percentage, adj_cost: row.yield_adjusted_unit_cost },
      performed_by: actorId,
      notes: `Added yield ${row.name ?? ""} (${row.yield_percentage}% yield)`,
      before_state: { type: "yield", id: row.id, row: null },
      after_state: await captureEntity("yield", row.id),
    });
    await cascadeMaterial(input.ingredient_id, actorId, "Yield added");
    return row;
  },

  async update(id: string, input: YieldInput, actorId: string): Promise<IngredientYield> {
    const c = sb();
    const { data: before, error: beforeErr } = await c
      .from("ingredient_yields")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (beforeErr) fail("Update yield", beforeErr.message);
    if (!before) fail("Update yield", "Yield record not found");
    const prev = before as IngredientYield;
    if (await findDuplicate(input, input.effective_from ?? prev.effective_from, id)) {
      fail("Update yield", DUPLICATE_MSG);
    }

    const { data, error } = await c
      .from("ingredient_yields")
      .update({ ...derive(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) fail("Update yield", error.message);
    const row = data as IngredientYield;

    await audit({
      entity_type: "yield",
      entity_id: row.id,
      action: "update",
      old_values: { yield_pct: prev.yield_percentage, adj_cost: prev.yield_adjusted_unit_cost },
      new_values: { yield_pct: row.yield_percentage, adj_cost: row.yield_adjusted_unit_cost },
      performed_by: actorId,
      notes: `Updated yield ${row.name ?? ""} (${row.yield_percentage}% yield)`,
      before_state: { type: "yield", id, row: prev as unknown as Record<string, unknown> },
      after_state: await captureEntity("yield", row.id),
    });
    // Recompute the new ingredient; if the row was repointed, the old one too.
    await cascadeMaterial(row.ingredient_id, actorId, "Yield updated");
    if (prev.ingredient_id !== row.ingredient_id) {
      await cascadeMaterial(prev.ingredient_id, actorId, "Yield updated");
    }
    return row;
  },

  /**
   * Bulk yield import. Ingredients are resolved by name (must already exist).
   * Upserts by (ingredient, effective_from); recipe costs using each affected
   * ingredient are recomputed via the yield-adjusted cost cascade.
   */
  async importYields(
    mode: "add" | "update" | "upsert",
    rows: ImportYieldRow[],
    actorId: string,
  ): Promise<ImportSummary> {
    const c = sb();
    const S: ImportSummary = { total: 0, imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

    // Resolve ingredients by name (matches the mock's case-insensitive map).
    const { data: mats, error: matErr } = await c
      .from("raw_materials")
      .select("id, ingredient_name");
    if (matErr) fail("Import yields", matErr.message);
    const matByName = new Map(
      (mats ?? []).map((m: { id: string; ingredient_name: string }) => [m.ingredient_name.toLowerCase(), m]),
    );

    const affected = new Set<string>();
    const batchId = newBatchId();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      S.total++;
      try {
        const mat = matByName.get(row.ingredient_name.trim().toLowerCase());
        if (!mat) {
          S.failed++;
          S.errors.push({ row: i + 1, message: `Ingredient not found: "${row.ingredient_name}"` });
          continue;
        }
        const eff = row.effective_from || todayISO();
        const input: YieldInput = {
          name: row.name?.trim() || `${mat.ingredient_name} Yield`,
          ingredient_id: mat.id,
          purchase_cost: row.purchase_cost,
          purchase_quantity: row.purchase_quantity,
          purchase_unit: row.purchase_unit,
          wastage_quantity: row.wastage_quantity,
          wastage_unit: baseUnitLabel(row.purchase_unit),
          effective_from: eff,
          notes: row.notes ?? null,
        };
        const derived = derive(input);
        if (!(derived.usable_quantity > 0)) {
          S.failed++;
          S.errors.push({ row: i + 1, message: `${row.ingredient_name}: wastage exceeds the raw quantity` });
          continue;
        }

        const existing = await findDuplicate(input, eff);

        if (existing) {
          if (mode === "add") {
            S.skipped++;
            continue;
          }
          const beforeRow = await captureEntity("yield", existing.id);
          const { error: upErr } = await c
            .from("ingredient_yields")
            .update({ ...derived, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (upErr) throw new Error(upErr.message);
          S.updated++;
          await audit({
            entity_type: "yield",
            entity_id: existing.id,
            action: "update",
            new_values: { yield_pct: derived.yield_percentage },
            performed_by: actorId,
            notes: `Imported — updated yield ${input.name ?? ""}`,
            before_state: beforeRow,
            after_state: await captureEntity("yield", existing.id),
            batch_id: batchId,
          });
        } else {
          if (mode === "update") {
            S.skipped++;
            continue;
          }
          const { data: insData, error: insErr } = await c
            .from("ingredient_yields")
            .insert({ ...derived, created_by: actorId })
            .select("id")
            .single();
          if (insErr) throw new Error(insErr.message);
          S.imported++;
          const newId = (insData as { id: string }).id;
          await audit({
            entity_type: "yield",
            entity_id: newId,
            action: "create",
            new_values: { yield_pct: derived.yield_percentage },
            performed_by: actorId,
            notes: `Imported — added yield ${input.name ?? ""}`,
            before_state: { type: "yield", id: newId, row: null },
            after_state: await captureEntity("yield", newId),
            batch_id: batchId,
          });
        }
        affected.add(mat.id);
      } catch (e) {
        S.failed++;
        S.errors.push({ row: i + 1, message: e instanceof Error ? e.message : "Failed" });
      }
    }

    for (const id of affected) await cascadeMaterial(id, actorId, "Yield import");
    await audit({
      entity_type: "yield",
      entity_id: "import",
      action: "create",
      new_values: { added: S.imported, updated: S.updated },
      performed_by: actorId,
      notes: `Imported yields — ${S.imported} added, ${S.updated} updated`,
      batch_id: batchId,
    });
    return S;
  },

  async remove(id: string, actorId: string): Promise<void> {
    const c = sb();
    // Need the ingredient_id (for the cascade + audit) before deleting; mirror
    // the mock's silent no-op when the row doesn't exist.
    // Snapshot the full row BEFORE deleting — otherwise the delete is unrecoverable.
    const before = await captureEntity("yield", id);
    if (!before?.row) return;
    const ingredientId = before.row.ingredient_id as string;

    const { error } = await c.from("ingredient_yields").delete().eq("id", id);
    if (error) fail("Delete yield", error.message);

    await audit({
      entity_type: "yield",
      entity_id: id,
      action: "delete",
      performed_by: actorId,
      notes: `Deleted yield ${(before.row.name as string) ?? "record"}`,
      before_state: before,
      after_state: { type: "yield", id, row: null },
    });
    await cascadeMaterial(ingredientId, actorId, "Yield removed");
  },

  /** Delete several yield records at once; each affected ingredient re-costs once. */
  async bulkRemove(ids: string[], actorId: string): Promise<number> {
    const c = sb();
    const affected = new Set<string>();
    let deleted = 0;
    const batchId = newBatchId();
    for (const id of ids) {
      const before = await captureEntity("yield", id);
      if (!before?.row) continue;
      const { error } = await c.from("ingredient_yields").delete().eq("id", id);
      if (error) fail("Delete yields", error.message);
      affected.add(before.row.ingredient_id as string);
      deleted++;
      await audit({
        entity_type: "yield",
        entity_id: id,
        action: "delete",
        performed_by: actorId,
        notes: `Deleted yield ${(before.row.name as string) ?? "record"} (bulk)`,
        before_state: before,
        after_state: { type: "yield", id, row: null },
        batch_id: batchId,
      });
    }
    if (deleted > 0) {
      await audit({
        entity_type: "yield",
        entity_id: "bulk",
        action: "delete",
        performed_by: actorId,
        notes: `Deleted ${deleted} yield record${deleted === 1 ? "" : "s"}`,
        batch_id: batchId,
      });
    }
    for (const ing of affected) await cascadeMaterial(ing, actorId, "Yield removed");
    return deleted;
  },
};
