import type {
  AuditAction,
  AuditEntityType,
  AuditLog,
  AuditPage,
  SystemSetting,
  UserRecipeView,
  ViewType,
} from "../types";
import { delay, getDb, mutate, nowISO, uid } from "./db";
import { recordAudit } from "./recompute";
import { captureEntity } from "./snapshot";

// --- Viewer access (user_recipe_views) ------------------------------------
export const viewsRepo = {
  async listForUser(userId: string): Promise<UserRecipeView[]> {
    return delay(getDb().user_recipe_views.filter((v) => v.user_id === userId));
  },

  async listForRecipe(recipeId: string): Promise<UserRecipeView[]> {
    return delay(getDb().user_recipe_views.filter((v) => v.recipe_id === recipeId));
  },

  async setAccess(
    userId: string,
    recipeId: string,
    viewType: ViewType,
    actorId: string,
  ): Promise<UserRecipeView> {
    return delay(
      mutate((db) => {
        let row = db.user_recipe_views.find(
          (v) => v.user_id === userId && v.recipe_id === recipeId,
        );
        if (row) {
          row.view_type = viewType;
          row.assigned_by = actorId;
          row.assigned_at = nowISO();
        } else {
          row = {
            id: uid(),
            user_id: userId,
            recipe_id: recipeId,
            view_type: viewType,
            assigned_by: actorId,
            assigned_at: nowISO(),
          };
          db.user_recipe_views.push(row);
        }
        return row;
      }),
    );
  },

  async remove(userId: string, recipeId: string): Promise<void> {
    return delay(
      mutate((db) => {
        db.user_recipe_views = db.user_recipe_views.filter(
          (v) => !(v.user_id === userId && v.recipe_id === recipeId),
        );
      }),
    );
  },
};

// --- System settings -------------------------------------------------------
export const settingsRepo = {
  async getAll(): Promise<SystemSetting[]> {
    return delay([...getDb().system_settings]);
  },

  async get(key: string): Promise<string | null> {
    return delay(getDb().system_settings.find((s) => s.key === key)?.value ?? null);
  },

  async foodCostPct(): Promise<number> {
    const v = getDb().system_settings.find((s) => s.key === "food_cost_pct")?.value;
    return delay(v ? Number(v) : 30);
  },

  async set(key: string, value: string, actorId: string): Promise<void> {
    return delay(
      mutate((db) => {
        const beforeSnap = captureEntity(db, "settings", key);
        const row = db.system_settings.find((s) => s.key === key);
        const previous = row?.value ?? null;
        if (row) {
          row.value = value;
          row.updated_by = actorId;
          row.updated_at = nowISO();
        } else {
          db.system_settings.push({
            id: uid(),
            key,
            value,
            updated_by: actorId,
            updated_at: nowISO(),
          });
        }
        // Audited AFTER the write so after_state is the new value.
        if (previous !== value) {
          recordAudit(db, {
            entity_type: "settings",
            entity_id: key,
            action: "update",
            old_values: { [key]: previous },
            new_values: { [key]: value },
            performed_by: actorId,
            notes: `Changed setting ${key}: ${previous ?? "—"} → ${value}`,
            before_state: beforeSnap,
            after_state: captureEntity(db, "settings", key),
          });
        }
      }),
    );
  },
};

// --- Audit log -------------------------------------------------------------
export interface AuditFilter {
  entityType?: AuditEntityType | "all";
  /** Activity Log: filter by what happened (create/update/delete/login…). */
  action?: AuditAction | "all";
  userId?: string | "all";
  from?: string;
  to?: string;
  /** Matches the note, the actor's name/email and the entity id. */
  search?: string;
  /** Server-side paging (defaults: page 1, 50 rows). */
  page?: number;
  pageSize?: number;
}

/** Shared by both repos: does a row match the free-text search? */
export function auditMatchesSearch(row: AuditLog, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.notes, row.actor_name, row.actor_email, row.entity_id, row.entity_type, row.action]
    .some((v) => (v ?? "").toString().toLowerCase().includes(q));
}

export const auditRepo = {
  /** One page of the activity log, newest first (see AuditFilter). */
  async list(filter: AuditFilter = {}): Promise<AuditPage> {
    let rows = [...getDb().audit_logs];
    if (filter.entityType && filter.entityType !== "all") {
      rows = rows.filter((r) => r.entity_type === filter.entityType);
    }
    if (filter.action && filter.action !== "all") {
      rows = rows.filter((r) => r.action === filter.action);
    }
    if (filter.userId && filter.userId !== "all") {
      rows = rows.filter((r) => r.performed_by === filter.userId);
    }
    if (filter.from) rows = rows.filter((r) => r.performed_at >= filter.from!);
    if (filter.to) rows = rows.filter((r) => r.performed_at <= filter.to! + "T23:59:59.999Z");
    if (filter.search) rows = rows.filter((r) => auditMatchesSearch(r, filter.search!));
    rows.sort((a, b) => b.performed_at.localeCompare(a.performed_at));
    const total = rows.length;
    const size = filter.pageSize ?? 50;
    const start = ((filter.page ?? 1) - 1) * size;
    return delay({ rows: rows.slice(start, start + size), total });
  },

  /** Direct audit writer for events not covered by a specific repo. */
  async record(entry: {
    entity_type: AuditEntityType;
    entity_id: string;
    action: AuditLog["action"];
    performed_by: string | null;
    notes?: string;
  }): Promise<void> {
    return delay(mutate((db) => void recordAudit(db, entry)));
  },
};
