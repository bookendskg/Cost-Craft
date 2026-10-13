// Revert (0036) — put a record back the way it was before a change.
//
// The snapshot is written back directly (not through the entity repo) so the record
// is restored EXACTLY, including fields a repo's input shape doesn't cover, and a
// deleted record comes back under its original id. The cost cascade is then run by
// hand, because that's what the normal repo path would have done.

import type { AuditEntityType, AuditLog, AuditPage, EntitySnapshot } from "../types";
import { audit, cascadeMaterial, fail, recomputeRecipes, sb } from "./helpers";
import { captureEntity, ENTITY_SHAPE } from "./snapshot";
import {
  detectConflict,
  isRefusal,
  planRevert,
  type RevertPlan,
  type RevertResult,
} from "../revertPlan";

async function loadEntry(id: string): Promise<AuditLog> {
  const { data, error } = await sb().from("audit_logs").select("*").eq("id", id).maybeSingle();
  if (error) fail("Load change", error.message);
  if (!data) fail("Load change", "That change is no longer in the log");
  return data as AuditLog;
}

/** Re-run the costing the normal save path would have run. */
async function cascadeFor(plan: RevertPlan, actorId: string): Promise<void> {
  const reason = "Change reverted";
  if (plan.entityType === "ingredient") {
    await cascadeMaterial(plan.entityId, actorId, reason);
  } else if (plan.entityType === "yield") {
    const ingredientId = (plan.target?.row?.ingredient_id ?? plan.expected?.row?.ingredient_id) as
      | string
      | undefined;
    if (ingredientId) await cascadeMaterial(ingredientId, actorId, reason);
  } else if (plan.entityType === "recipe") {
    await recomputeRecipes([plan.entityId], actorId, reason);
  }
}

/** Write a snapshot back: the row itself, then its child rows. */
async function restoreSnapshot(snapshot: EntitySnapshot): Promise<void> {
  const shape = ENTITY_SHAPE[snapshot.type];
  if (!shape || !snapshot.row) return;
  const c = sb();
  const idColumn = shape.idColumn ?? "id";
  const up = await c.from(shape.table).upsert(snapshot.row, { onConflict: idColumn });
  if (up.error) fail("Revert change", up.error.message);

  for (const child of shape.children ?? []) {
    const rows = snapshot.children?.[child.table] ?? [];
    const del = await c.from(child.table).delete().eq(child.fk, snapshot.id);
    if (del.error) fail("Revert change", del.error.message);
    if (rows.length) {
      const ins = await c.from(child.table).insert(rows);
      if (ins.error) fail("Revert change", ins.error.message);
    }
  }
}

/** Remove a record the change had created (children first). */
async function deleteEntity(type: AuditEntityType, id: string): Promise<void> {
  const shape = ENTITY_SHAPE[type];
  if (!shape) return;
  const c = sb();
  for (const child of shape.children ?? []) {
    const del = await c.from(child.table).delete().eq(child.fk, id);
    if (del.error) fail("Revert change", del.error.message);
  }
  const del = await c.from(shape.table).delete().eq(shape.idColumn ?? "id", id);
  if (del.error) {
    if (del.error.code === "23503") {
      fail(
        "Revert change",
        "This record is now used by other records, so it can't be removed. Deactivate it instead.",
      );
    }
    fail("Revert change", del.error.message);
  }
}

export const supabaseRevertRepo = {
  /** Undo one logged change. Super-Admin-only via the audit_logs RLS policy (0035). */
  async revert(entryId: string, actorId: string, force = false): Promise<RevertResult> {
    const entry = await loadEntry(entryId);
    const decision = planRevert(entry);
    if (isRefusal(decision)) return { ok: false, message: decision.reason };
    const plan = decision;

    const current = await captureEntity(plan.entityType, plan.entityId);
    const { changedSince } = detectConflict(plan, current);
    if (changedSince && !force) {
      return {
        ok: false,
        conflict: true,
        message: "This record has changed since. Reverting will discard those later changes too.",
      };
    }

    if (plan.kind === "delete") await deleteEntity(plan.entityType, plan.entityId);
    else if (plan.target) await restoreSnapshot(plan.target);

    await cascadeFor(plan, actorId);

    await audit({
      entity_type: plan.entityType,
      entity_id: plan.entityId,
      action: "revert",
      performed_by: actorId,
      notes: `Reverted: ${plan.label}${entry.actor_name ? ` (by ${entry.actor_name})` : ""}`,
      before_state: current,
      after_state: await captureEntity(plan.entityType, plan.entityId),
      revert_of: entry.id,
    });

    return {
      ok: true,
      message:
        plan.kind === "restore"
          ? "Record restored."
          : plan.kind === "delete"
            ? "Record removed."
            : "Previous values restored.",
    };
  },

  /** Undo every change made by one import or bulk action, newest first. */
  async revertBatch(batchId: string, actorId: string, force = false): Promise<RevertResult> {
    const { data, error } = await sb()
      .from("audit_logs")
      .select("*")
      .eq("batch_id", batchId)
      .order("performed_at", { ascending: false });
    if (error) fail("Revert batch", error.message);
    const entries = ((data ?? []) as AuditLog[]).filter(
      (e) => e.entity_id !== "import" && e.entity_id !== "bulk" && e.action !== "revert",
    );
    let done = 0;
    const problems: string[] = [];
    for (const e of entries) {
      const r = await this.revert(e.id, actorId, force);
      if (r.ok) done++;
      else problems.push(r.message);
    }
    const conflicts = problems.length > 0 && !force;
    return {
      ok: done > 0,
      conflict: conflicts,
      message: problems.length
        ? `Reverted ${done} of ${entries.length} changes. ${problems[0]}`
        : `Reverted all ${done} changes.`,
    };
  },

  /** Ids of the changes already reverted, among the ones given (for the badge). */
  async revertedIds(entryIds: string[]): Promise<string[]> {
    if (!entryIds.length) return [];
    const { data, error } = await sb()
      .from("audit_logs")
      .select("revert_of")
      .in("revert_of", entryIds);
    if (error) return [];
    return ((data ?? []) as { revert_of: string | null }[])
      .map((r) => r.revert_of)
      .filter((v): v is string => !!v);
  },

  /** Every change in one batch (for the "revert all" confirmation). */
  async batchEntries(batchId: string): Promise<AuditPage> {
    const { data, error, count } = await sb()
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("batch_id", batchId)
      .order("performed_at", { ascending: false });
    if (error) fail("Load batch", error.message);
    const rows = (data ?? []) as AuditLog[];
    return { rows, total: count ?? rows.length };
  },
};
