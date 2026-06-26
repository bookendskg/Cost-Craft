import type { IngredientYield } from "../types";
import { computeYield } from "../../yield";
import { getUnitFamily } from "../../units";
import { delay, getDb, mutate, nowISO, todayISO, uid } from "./db";
import { recordAudit } from "./recompute";

export interface YieldInput {
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
        if (
          db.ingredient_yields.some(
            (y) => y.ingredient_id === input.ingredient_id && y.effective_from === eff,
          )
        ) {
          throw new Error("A yield record already exists for this ingredient on that effective date");
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
          entity_type: "ingredient",
          entity_id: input.ingredient_id,
          action: "create",
          new_values: { yield_pct: row.yield_percentage, adj_cost: row.yield_adjusted_unit_cost },
          performed_by: actorId,
          notes: `Added yield (${row.yield_percentage}% yield)`,
        });
        return row;
      }),
    );
  },

  async update(id: string, input: YieldInput, actorId: string): Promise<IngredientYield> {
    return delay(
      mutate((db) => {
        const y = db.ingredient_yields.find((x) => x.id === id);
        if (!y) throw new Error("Yield record not found");
        const before = { yield_pct: y.yield_percentage, adj_cost: y.yield_adjusted_unit_cost };
        Object.assign(y, derive(input), { updated_at: nowISO() });
        recordAudit(db, {
          entity_type: "ingredient",
          entity_id: y.ingredient_id,
          action: "update",
          old_values: before,
          new_values: { yield_pct: y.yield_percentage, adj_cost: y.yield_adjusted_unit_cost },
          performed_by: actorId,
          notes: `Updated yield (${y.yield_percentage}% yield)`,
        });
        return y;
      }),
    );
  },

  async remove(id: string, actorId: string): Promise<void> {
    return delay(
      mutate((db) => {
        const y = db.ingredient_yields.find((x) => x.id === id);
        if (!y) return;
        db.ingredient_yields = db.ingredient_yields.filter((x) => x.id !== id);
        recordAudit(db, {
          entity_type: "ingredient",
          entity_id: y.ingredient_id,
          action: "delete",
          performed_by: actorId,
          notes: "Deleted yield record",
        });
      }),
    );
  },
};
