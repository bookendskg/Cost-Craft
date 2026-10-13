// Shared, backend-agnostic logic for reverting a change (0036).
//
// A revert replays the snapshot stored with the change: an edit writes the old
// record back, a creation is deleted, a deletion is restored with its original id.
// The plan here decides WHAT should happen and whether it is safe; the repos
// (mock + Supabase) carry it out through their normal methods, so cost cascades,
// price history and a fresh audit row all still happen.

import type { AuditEntityType, AuditLog, EntitySnapshot } from "./types";

/** Entity types whose changes can never be undone. */
const NOT_REVERTIBLE: Partial<Record<AuditEntityType, string>> = {
  session: "Sign-ins and sign-outs aren't changes to undo.",
  export: "An export only reads data — there's nothing to undo.",
  system: "A catalog wipe can't be undone from the app — restore a database backup.",
};

export type RevertKind = "restore" | "delete" | "update";

export interface RevertPlan {
  kind: RevertKind;
  entityType: AuditEntityType;
  entityId: string;
  /** The state to write back (null for a delete). */
  target: EntitySnapshot | null;
  /** The state this change left behind — used to detect later edits. */
  expected: EntitySnapshot | null;
  label: string;
}

export interface RevertRefusal {
  reason: string;
}

export type RevertDecision = RevertPlan | RevertRefusal;

export const isRefusal = (d: RevertDecision): d is RevertRefusal => "reason" in d;

/** Can this log entry be reverted at all, and what would it do? */
export function planRevert(entry: AuditLog): RevertDecision {
  const blocked = NOT_REVERTIBLE[entry.entity_type];
  if (blocked) return { reason: blocked };
  if (entry.action === "revert") return { reason: "This entry is itself a revert." };
  if (entry.entity_id === "import" || entry.entity_id === "bulk") {
    return { reason: "This is a summary — revert the batch instead." };
  }
  const before = (entry.before_state ?? null) as EntitySnapshot | null;
  const after = (entry.after_state ?? null) as EntitySnapshot | null;
  if (!before && !after) {
    return { reason: "This change was recorded before snapshots existed, so it can't be undone." };
  }

  const label = entry.notes ?? `${entry.action} ${entry.entity_type}`;
  // The record existed before and still exists → put the old values back.
  if (before?.row && after?.row) {
    return { kind: "update", entityType: entry.entity_type, entityId: entry.entity_id, target: before, expected: after, label };
  }
  // It didn't exist before → the change created it, so undo = delete.
  if (!before?.row && after?.row) {
    return { kind: "delete", entityType: entry.entity_type, entityId: entry.entity_id, target: null, expected: after, label };
  }
  // It existed and is now gone → undo = restore it (with its original id).
  if (before?.row && !after?.row) {
    return { kind: "restore", entityType: entry.entity_type, entityId: entry.entity_id, target: before, expected: after, label };
  }
  return { reason: "Nothing was recorded for this change." };
}

/** Fields that always differ between two reads and must never count as a conflict. */
const VOLATILE = new Set([
  "updated_at",
  "updated_by",
  "created_at",
  "last_price_update",
  "cost_per_base_unit",
  "total_cost",
  "cost_per_portion",
  "total_weight_g",
  "calculated_cost",
  "version_no",
]);

function stableRow(row: Record<string, unknown> | null): string {
  if (!row) return "null";
  const entries = Object.entries(row)
    .filter(([k]) => !VOLATILE.has(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

/**
 * Has the record changed since this entry? Compares the record's current state
 * with the state the change left behind, ignoring recomputed/derived fields
 * (a later price cascade must not look like someone editing the record).
 */
export function detectConflict(
  plan: RevertPlan,
  current: EntitySnapshot | null,
): { changedSince: boolean } {
  return { changedSince: stableRow(current?.row ?? null) !== stableRow(plan.expected?.row ?? null) };
}

export interface RevertResult {
  ok: boolean;
  /** What happened, for the toast / confirmation dialog. */
  message: string;
  conflict?: boolean;
}
