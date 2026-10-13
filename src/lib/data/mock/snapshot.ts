// Mock twin of src/lib/data/supabase/snapshot.ts — same snapshot shape, read from
// the in-memory MockDb so revert behaves identically on both backends.

import type { AuditEntityType, EntitySnapshot } from "../types";
import type { MockDb } from "./db";

type Row = Record<string, unknown>;

/** Which MockDb array holds each entity, how it's keyed, and its child arrays. */
export const MOCK_ENTITY_SHAPE: Partial<
  Record<
    AuditEntityType,
    { table: keyof MockDb; idField?: string; children?: { table: keyof MockDb; fk: string }[] }
  >
> = {
  ingredient: { table: "raw_materials", children: [{ table: "ingredient_yields", fk: "ingredient_id" }] },
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
  role: { table: "roles", idField: "key" },
  user: { table: "users" },
  settings: { table: "system_settings", idField: "key" },
  accessLink: { table: "recipe_access_links" },
};

export function isSnapshotable(type: AuditEntityType): boolean {
  return type in MOCK_ENTITY_SHAPE;
}

/** Deep copy so later mutations can't rewrite a stored snapshot. */
const clone = <T,>(v: T): T => structuredClone(v);

export function captureEntity(db: MockDb, type: AuditEntityType, id: string): EntitySnapshot | null {
  const shape = MOCK_ENTITY_SHAPE[type];
  if (!shape || !id) return null;
  const idField = shape.idField ?? "id";
  const rows = db[shape.table] as unknown as Row[];
  const row = rows.find((r) => r[idField] === id) ?? null;
  const snapshot: EntitySnapshot = { type, id, row: row ? clone(row) : null };
  if (row && shape.children?.length) {
    const children: Record<string, Row[]> = {};
    for (const child of shape.children) {
      const all = db[child.table] as unknown as Row[];
      children[child.table as string] = clone(all.filter((r) => r[child.fk] === id));
    }
    snapshot.children = children;
  }
  return snapshot;
}
