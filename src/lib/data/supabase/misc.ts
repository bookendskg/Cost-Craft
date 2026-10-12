// Supabase-backed settings + audit repos, so both are SHARED across users (not
// per-browser) in Supabase mode. Reads are fail-safe (fall back to empty/null so
// the UI degrades to its defaults rather than breaking); writes surface real
// errors. Viewer-access (user_recipe_views) stays on the mock layer for now — its
// table FKs to a legacy `users` table and there are no Viewers yet.

import type { AuditEntityType, AuditLog, AuditPage, SystemSetting } from "../types";
import type { AuditFilter } from "../mock/misc";
import { sb, fail, audit as auditInsert } from "./helpers";

export const supabaseSettingsRepo = {
  async getAll(): Promise<SystemSetting[]> {
    const { data, error } = await sb().from("system_settings").select("*");
    if (error) return [];
    return (data ?? []) as SystemSetting[];
  },

  async get(key: string): Promise<string | null> {
    const { data, error } = await sb()
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) return null;
    return ((data?.value as string | undefined) ?? null) as string | null;
  },

  async foodCostPct(): Promise<number> {
    const { data, error } = await sb()
      .from("system_settings")
      .select("value")
      .eq("key", "food_cost_pct")
      .maybeSingle();
    const v = error ? null : ((data?.value as string | undefined) ?? null);
    return v ? Number(v) : 30;
  },

  async set(key: string, value: string, actorId: string): Promise<void> {
    const previous = await this.get(key);
    // updated_by left null to sidestep the legacy users(id) FK; RLS already gates
    // writes to admins/super-admins (settings_write policy). The actor is recorded
    // in the activity log instead.
    const { error } = await sb()
      .from("system_settings")
      .upsert({ key, value, updated_by: null, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) fail("Save setting", error.message);

    if (previous !== value) {
      await auditInsert({
        entity_type: "settings",
        entity_id: key,
        action: "update",
        old_values: { [key]: previous },
        new_values: { [key]: value },
        performed_by: actorId,
        notes: `Changed setting ${key}: ${previous ?? "—"} → ${value}`,
      });
    }
  },
};

export const supabaseAuditRepo = {
  /**
   * One page of the activity log, newest first. Only Super Admins can read the
   * table (RLS audit_read, 0035) — for anyone else this returns an empty page.
   */
  async list(filter: AuditFilter = {}): Promise<AuditPage> {
    const size = filter.pageSize ?? 50;
    const page = filter.page ?? 1;
    let q = sb()
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("performed_at", { ascending: false });
    if (filter.entityType && filter.entityType !== "all") q = q.eq("entity_type", filter.entityType);
    if (filter.action && filter.action !== "all") q = q.eq("action", filter.action);
    if (filter.userId && filter.userId !== "all") q = q.eq("performed_by", filter.userId);
    if (filter.from) q = q.gte("performed_at", filter.from);
    if (filter.to) q = q.lte("performed_at", filter.to + "T23:59:59.999Z");
    // Free text spans a jsonb-free set of columns, so it's an OR over them.
    if (filter.search?.trim()) {
      const like = `%${filter.search.trim().replace(/[%,]/g, " ")}%`;
      q = q.or(
        [`notes.ilike.${like}`, `actor_name.ilike.${like}`, `actor_email.ilike.${like}`, `entity_id.ilike.${like}`].join(","),
      );
    }
    const { data, error, count } = await q.range((page - 1) * size, page * size - 1);
    if (error) fail("Load activity log", error.message);
    const rows = (data ?? []) as AuditLog[];
    return { rows, total: count ?? rows.length };
  },

  /** Direct audit writer (best-effort; the helper swallows errors so it never
   *  blocks the caller). Most audit rows are written by the data repos already. */
  async record(entry: {
    entity_type: AuditEntityType;
    entity_id: string;
    action: AuditLog["action"];
    performed_by: string | null;
    notes?: string;
  }): Promise<void> {
    await auditInsert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      performed_by: entry.performed_by,
      notes: entry.notes ?? null,
    });
  },
};
