// Entity snapshots (0036) — the complete record plus its child rows, captured
// before and after every mutation so a Super Admin can revert it.
//
// Children matter: restoring a deleted recipe without its ingredient lines and
// packaging would bring back an empty shell, and restoring a deleted ingredient
// under a NEW id would leave recipe lines orphaned (recipe_ingredients.ingredient_id
// has no foreign key), so the revert reuses the original id from the snapshot.

import type { AuditEntityType, EntitySnapshot } from "../types";
import { sb } from "./helpers";

/** Table + child tables (child FK column) for each snapshot-able entity. */
export const ENTITY_SHAPE: Partial<
  Record<AuditEntityType, { table: string; idColumn?: string; children?: { table: string; fk: string }[] }>
> = {
  ingredient: {
    table: "raw_materials",
    // Yields die with the ingredient (ON DELETE CASCADE, 0005), so they travel with it.
    children: [{ table: "ingredient_yields", fk: "ingredient_id" }],
  },
  recipe: {
    table: "recipes",
    children: [
      { table: "recipe_ingredients", fk: "recipe_id" },
      { table: "recipe_packaging", fk: "recipe_id" },
    ],
  },
  yield: { table: "ingredient_yields" },
  wastage: { table: "wastage_entries", children: [{ table: "wastage_lines", fk: "wastage_id" }] },
  packaging: { table: "packaging_items" },
  brand: { table: "brands" },
  outlet: { table: "outlets" },
  role: { table: "roles", idColumn: "key", children: [{ table: "role_capabilities", fk: "role_key" }] },
  user: { table: "user_profiles" },
  settings: { table: "system_settings", idColumn: "key" },
  accessLink: { table: "recipe_access_links" },
};

/** True when changes to this entity can be captured (and therefore reverted). */
export function isSnapshotable(type: AuditEntityType): boolean {
  return type in ENTITY_SHAPE;
}

/**
 * Read an entity's current state. Returns a snapshot with `row: null` when the
 * record doesn't exist — that's a valid state (before a create, after a delete).
 * Never throws: a failed snapshot must not block the mutation itself.
 */
export async function captureEntity(
  type: AuditEntityType,
  id: string,
): Promise<EntitySnapshot | null> {
  const shape = ENTITY_SHAPE[type];
  if (!shape || !id) return null;
  const idColumn = shape.idColumn ?? "id";
  try {
    const c = sb();
    const { data, error } = await c.from(shape.table).select("*").eq(idColumn, id).maybeSingle();
    if (error) {
      console.error(`Snapshot ${type} failed:`, error.message);
      return null;
    }
    const row = (data as Record<string, unknown> | null) ?? null;
    const snapshot: EntitySnapshot = { type, id, row };
    if (row && shape.children?.length) {
      const children: Record<string, Record<string, unknown>[]> = {};
      for (const child of shape.children) {
        const res = await c.from(child.table).select("*").eq(child.fk, id);
        if (!res.error) children[child.table] = (res.data ?? []) as Record<string, unknown>[];
      }
      snapshot.children = children;
    }
    return snapshot;
  } catch (e) {
    console.error(`Snapshot ${type} failed:`, e);
    return null;
  }
}
