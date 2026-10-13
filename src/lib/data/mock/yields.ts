import type { IngredientYield } from "../types";
import type { ImportSummary } from "../../import/importTypes";
import { computeYield } from "../../yield";
import { getUnitFamily } from "../../units";
import { delay, getDb, mutate, nowISO, todayISO, uid } from "./db";
import { cascadeFromMaterial, recordAudit } from "./recompute";
import { captureEntity } from "./snapshot";
import { newBatchId } from "../batch";

export interface YieldInput {
  name?: string | null;
  ingredient_id: string;
  purchase_cost: number;
  purchase_quantity: number;
  purchase_unit: string;
  /** Wastage in the base unit (Gram/ML/piece). */
  wastage_quantity: number;
  wastage_unit: string;
  effective_from?: string;
  notes?: string | null;
}

/** One row of a yield import — ingredient resolved by name. */
export interface ImportYieldRow {
  ingredient_name: string;
  /** Prep label ("Chopped Green Garlic"); blank falls back to "<Ingredient> Yield". */
  name?: string | null;
  purchase_cost: number;
  purchase_quantity: number;
  purchase_unit: string;
  wastage_quantity: number;
  effective_from?: string | null;
  notes?: string | null;
}

/** Base unit label for the purchase unit's family. */
function baseUnitLabel(unit: string): string {
  const fam = getUnitFamily(unit);
  return fam === "weight" ? "Gram" : fam === "volume" ? "ML" : unit;
}

/** Derive the full stored yield record from raw inputs. */
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

/** A yield record is identified by ingredient + prep name + effective date, so one
 *  ingredient can hold several preps ("Chopped"/"Processed") on the same date. */
export const DUPLICATE_MSG = "A yield record already exists for this prep on that effective date";

export const normalizeYieldName = (name: string | null | undefined): string =>
  (name ?? "").replace(/\s+/g, " ").trim().toLowerCase();

export function duplicateYield(
  rows: IngredientYield[],
  input: YieldInput,
  eff: string,
  ignoreId?: string,
): IngredientYield | undefined {
  const key = normalizeYieldName(input.name);
  return rows.find(
    (y) =>
      y.id !== ignoreId &&
      y.ingredient_id === input.ingredient_id &&
      y.effective_from === eff &&
      normalizeYieldName(y.name) === key,
  );
}

export const yieldsRepo = {
  async list(): Promise<IngredientYield[]> {
    return delay([...getDb().ingredient_yields]);
  },

  async getById(id: string): Promise<IngredientYield | null> {
    return delay(getDb().ingredient_yields.find((y) => y.id === id) ?? null);
  },

  async listForIngredient(ingredientId: string): Promise<IngredientYield[]> {
    return delay(
      getDb()
        .ingredient_yields.filter((y) => y.ingredient_id === ingredientId)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from)),
    );
  },

  async create(input: YieldInput, actorId: string): Promise<IngredientYield> {
    return delay(
      mutate((db) => {
        const eff = input.effective_from ?? todayISO();
        if (duplicateYield(db.ingredient_yields, input, eff)) {
          throw new Error(DUPLICATE_MSG);
        }
        const row: IngredientYield = {
          id: uid(),
          ...derive(input),
          created_at: nowISO(),
          updated_at: nowISO(),
          created_by: actorId,
        };
        db.ingredient_yields.push(row);
        recordAudit(db, {
          entity_type: "yield",
          entity_id: input.ingredient_id,
          action: "create",
          new_values: { yield_pct: row.yield_percentage, adj_cost: row.yield_adjusted_unit_cost },
          performed_by: actorId,
          notes: `Added yield (${row.yield_percentage}% yield)`,
          before_state: { type: "yield", id: input.ingredient_id, row: null },
          after_state: captureEntity(db, "yield", input.ingredient_id),
        });
        // Recompute every recipe using this ingredient with the yield-adjusted cost.
        cascadeFromMaterial(db, input.ingredient_id, actorId, "Yield added");
        return row;
      }),
    );
  },

  async update(id: string, input: YieldInput, actorId: string): Promise<IngredientYield> {
    return delay(
      mutate((db) => {
        const beforeSnap = captureEntity(db, "yield", id);
        const y = db.ingredient_yields.find((x) => x.id === id);
        if (!y) throw new Error("Yield record not found");
        if (duplicateYield(db.ingredient_yields, input, input.effective_from ?? y.effective_from, id)) {
          throw new Error(DUPLICATE_MSG);
        }
        const before = { yield_pct: y.yield_percentage, adj_cost: y.yield_adjusted_unit_cost };
        const prevIngredient = y.ingredient_id;
        Object.assign(y, derive(input), { updated_at: nowISO() });
        recordAudit(db, {
          entity_type: "yield",
          entity_id: y.ingredient_id,
          action: "update",
          old_values: before,
          new_values: { yield_pct: y.yield_percentage, adj_cost: y.yield_adjusted_unit_cost },
          performed_by: actorId,
          notes: `Updated yield (${y.yield_percentage}% yield)`,
          before_state: beforeSnap,
          after_state: captureEntity(db, "yield", y.ingredient_id),
        });
        // Recompute recipes using this ingredient (and the old one, if it changed).
        cascadeFromMaterial(db, y.ingredient_id, actorId, "Yield updated");
        if (prevIngredient !== y.ingredient_id) cascadeFromMaterial(db, prevIngredient, actorId, "Yield updated");
        return y;
      }),
    );
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
    return delay(
      mutate((db) => {
        const S: ImportSummary = { total: 0, imported: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
        const matByName = new Map(db.raw_materials.map((m) => [m.ingredient_name.toLowerCase(), m]));
        const affected = new Set<string>();
        const batchId = newBatchId();
        rows.forEach((row, i) => {
          S.total++;
          try {
            const mat = matByName.get(row.ingredient_name.trim().toLowerCase());
            if (!mat) {
              S.failed++;
              S.errors.push({ row: i + 1, message: `Ingredient not found: "${row.ingredient_name}"` });
              return;
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
              return;
            }
            const existing = duplicateYield(db.ingredient_yields, input, eff);
            if (existing) {
              if (mode === "add") {
                S.skipped++;
                return;
              }
              const beforeRow = captureEntity(db, "yield", existing.id);
              Object.assign(existing, derived, { updated_at: nowISO() });
              S.updated++;
              recordAudit(db, {
                entity_type: "yield",
                entity_id: existing.id,
                action: "update",
                new_values: { yield_pct: existing.yield_percentage },
                performed_by: actorId,
                notes: `Imported — updated yield ${existing.name ?? ""}`,
                before_state: beforeRow,
                after_state: captureEntity(db, "yield", existing.id),
                batch_id: batchId,
              });
            } else {
              if (mode === "update") {
                S.skipped++;
                return;
              }
              const created = {
                id: uid(),
                ...derived,
                created_at: nowISO(),
                updated_at: nowISO(),
                created_by: actorId,
              };
              db.ingredient_yields.push(created);
              S.imported++;
              recordAudit(db, {
                entity_type: "yield",
                entity_id: created.id,
                action: "create",
                new_values: { yield_pct: created.yield_percentage },
                performed_by: actorId,
                notes: `Imported — added yield ${created.name ?? ""}`,
                before_state: { type: "yield", id: created.id, row: null },
                after_state: captureEntity(db, "yield", created.id),
                batch_id: batchId,
              });
            }
            affected.add(mat.id);
          } catch (e) {
            S.failed++;
            S.errors.push({ row: i + 1, message: e instanceof Error ? e.message : "Failed" });
          }
        });
        for (const id of affected) cascadeFromMaterial(db, id, actorId, "Yield import");
        recordAudit(db, {
          entity_type: "yield",
          entity_id: "import",
          action: "create",
          new_values: { added: S.imported, updated: S.updated },
          performed_by: actorId,
          notes: `Imported yields — ${S.imported} added, ${S.updated} updated`,
          batch_id: batchId,
          before_state: { type: "yield", id: "import", row: null },
          after_state: captureEntity(db, "yield", "import"),
        });
        return S;
      }),
    );
  },

  async remove(id: string, actorId: string): Promise<void> {
    return delay(
      mutate((db) => {
        const beforeSnap = captureEntity(db, "yield", id);
        const y = db.ingredient_yields.find((x) => x.id === id);
        if (!y) return;
        db.ingredient_yields = db.ingredient_yields.filter((x) => x.id !== id);
        recordAudit(db, {
          entity_type: "yield",
          entity_id: y.ingredient_id,
          action: "delete",
          performed_by: actorId,
          notes: "Deleted yield record",
          before_state: beforeSnap,
          after_state: captureEntity(db, "yield", y.ingredient_id),
        });
        // Removing the yield reverts affected recipes to the standard (un-adjusted) cost.
        cascadeFromMaterial(db, y.ingredient_id, actorId, "Yield removed");
      }),
    );
  },

  /** Delete several yield records at once; each affected ingredient re-costs once. */
  async bulkRemove(ids: string[], actorId: string): Promise<number> {
    return delay(
      mutate((db) => {
        let deleted = 0;
        const affected = new Set<string>();
        for (const id of ids) {
          const beforeSnap = captureEntity(db, "yield", id);
          const y = db.ingredient_yields.find((x) => x.id === id);
          if (!y) continue;
          db.ingredient_yields = db.ingredient_yields.filter((x) => x.id !== id);
          recordAudit(db, {
            entity_type: "yield",
            entity_id: y.ingredient_id,
            action: "delete",
            performed_by: actorId,
            notes: "Deleted yield record",
            before_state: beforeSnap,
            after_state: captureEntity(db, "yield", y.ingredient_id),
          });
          affected.add(y.ingredient_id);
          deleted++;
        }
        for (const ing of affected) cascadeFromMaterial(db, ing, actorId, "Yield removed");
        return deleted;
      }),
    );
  },
};
