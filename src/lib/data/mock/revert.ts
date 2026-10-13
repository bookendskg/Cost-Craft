// Mock twin of src/lib/data/supabase/revert.ts — same decisions, same outcomes,
// against the in-memory MockDb. This is the version the tests exercise.

import type { AuditEntityType, AuditPage, EntitySnapshot } from "../types";
import { delay, getDb, type MockDb, mutate } from "./db";
import { cascadeFromMaterial, recomputeAndPropagate, recordAudit } from "./recompute";
import { captureEntity, MOCK_ENTITY_SHAPE } from "./snapshot";
import {
  detectConflict,
  isRefusal,
  planRevert,
  type RevertPlan,
  type RevertResult,
} from "../revertPlan";

type Row = Record<string, unknown>;

function restoreSnapshot(db: MockDb, snapshot: EntitySnapshot): void {
  const shape = MOCK_ENTITY_SHAPE[snapshot.type];
  if (!shape || !snapshot.row) return;
  const idField = shape.idField ?? "id";
  const rows = db[shape.table] as unknown as Row[];
  const idx = rows.findIndex((r) => r[idField] === snapshot.id);
  const restored = structuredClone(snapshot.row);
  if (idx >= 0) rows[idx] = restored;
  else rows.push(restored);

  for (const child of shape.children ?? []) {
    const all = db[child.table] as unknown as Row[];
    const kept = all.filter((r) => r[child.fk] !== snapshot.id);
    kept.push(...structuredClone(snapshot.children?.[child.table as string] ?? []));
    (db[child.table] as unknown as Row[]).length = 0;
    (db[child.table] as unknown as Row[]).push(...kept);
  }
}

function deleteEntity(db: MockDb, type: AuditEntityType, id: string): void {
  const shape = MOCK_ENTITY_SHAPE[type];
  if (!shape) return;
  const idField = shape.idField ?? "id";
  for (const child of shape.children ?? []) {
    const all = db[child.table] as unknown as Row[];
    const kept = all.filter((r) => r[child.fk] !== id);
    all.length = 0;
    all.push(...kept);
  }
  const rows = db[shape.table] as unknown as Row[];
  const kept = rows.filter((r) => r[idField] !== id);
  rows.length = 0;
  rows.push(...kept);
}

function cascadeFor(db: MockDb, plan: RevertPlan, actorId: string): void {
  const reason = "Change reverted";
  if (plan.entityType === "ingredient") {
    cascadeFromMaterial(db, plan.entityId, actorId, reason);
  } else if (plan.entityType === "yield") {
    const ingredientId = (plan.target?.row?.ingredient_id ?? plan.expected?.row?.ingredient_id) as
      | string
      | undefined;
    if (ingredientId) cascadeFromMaterial(db, ingredientId, actorId, reason);
  } else if (plan.entityType === "recipe") {
    recomputeAndPropagate(db, [plan.entityId], actorId, reason);
  }
}

export const mockRevertRepo = {
  async revert(entryId: string, actorId: string, force = false): Promise<RevertResult> {
    return delay(
      mutate((db) => {
        const entry = db.audit_logs.find((a) => a.id === entryId);
        if (!entry) return { ok: false, message: "That change is no longer in the log" };
        const decision = planRevert(entry);
        if (isRefusal(decision)) return { ok: false, message: decision.reason };
        const plan = decision;

        const current = captureEntity(db, plan.entityType, plan.entityId);
        const { changedSince } = detectConflict(plan, current);
        if (changedSince && !force) {
          return {
            ok: false,
            conflict: true,
            message: "This record has changed since. Reverting will discard those later changes too.",
          };
        }

        if (plan.kind === "delete") deleteEntity(db, plan.entityType, plan.entityId);
        else if (plan.target) restoreSnapshot(db, plan.target);

        cascadeFor(db, plan, actorId);

        recordAudit(db, {
          entity_type: plan.entityType,
          entity_id: plan.entityId,
          action: "revert",
          performed_by: actorId,
          notes: `Reverted: ${plan.label}${entry.actor_name ? ` (by ${entry.actor_name})` : ""}`,
          before_state: current,
          after_state: captureEntity(db, plan.entityType, plan.entityId),
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
      }),
    );
  },

  async revertBatch(batchId: string, actorId: string, force = false): Promise<RevertResult> {
    const entries = getDb()
      .audit_logs.filter(
        (a) =>
          a.batch_id === batchId &&
          a.entity_id !== "import" &&
          a.entity_id !== "bulk" &&
          a.action !== "revert",
      )
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at));
    let done = 0;
    const problems: string[] = [];
    for (const e of entries) {
      const r = await this.revert(e.id, actorId, force);
      if (r.ok) done++;
      else problems.push(r.message);
    }
    return {
      ok: done > 0,
      conflict: problems.length > 0 && !force,
      message: problems.length
        ? `Reverted ${done} of ${entries.length} changes. ${problems[0]}`
        : `Reverted all ${done} changes.`,
    };
  },

  async revertedIds(entryIds: string[]): Promise<string[]> {
    const set = new Set(entryIds);
    return delay(
      getDb()
        .audit_logs.map((a) => a.revert_of)
        .filter((v): v is string => !!v && set.has(v)),
    );
  },

  async batchEntries(batchId: string): Promise<AuditPage> {
    const rows = getDb()
      .audit_logs.filter((a) => a.batch_id === batchId)
      .sort((a, b) => b.performed_at.localeCompare(a.performed_at));
    return delay({ rows, total: rows.length });
  },
};
