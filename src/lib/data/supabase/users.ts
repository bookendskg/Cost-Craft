// Supabase-backed users repository (Supabase Auth). Mirrors the mock `usersRepo`
// interface so feature code is unchanged — selection happens in src/lib/data/index.ts
// by whether Supabase is configured. Backed by the `public.user_profiles` table
// (db/migrations/0007); access is enforced by RLS keyed on the Supabase auth uid.

import { supabase } from "@/lib/supabase/client";
import { profileToUser, type ProfileRow } from "@/lib/supabase/types";
import type { User } from "../types";
import type { CreateUserInput, UpdateUserInput } from "../mock/users";
import { audit } from "./helpers";
import { captureEntity } from "./snapshot";

function fail(context: string, message?: string): never {
  throw new Error(message || `${context} failed`);
}

function client() {
  if (!supabase) fail("Supabase is not configured");
  return supabase;
}

/**
 * The real reason an Edge Function call failed. A FunctionsHttpError carries the
 * Response, so read its JSON body rather than showing a bare status code.
 */
async function functionError(error: unknown, fn: string): Promise<string> {
  let msg = (error as { message?: string })?.message || `${fn} failed`;
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string };
      if (body?.error) msg = body.error;
    } catch {
      // body wasn't JSON — keep the original message
    }
  }
  // Most common cause: the Edge Function hasn't been deployed yet.
  if (/failed to send a request|function not found|not found|failed to fetch/i.test(msg)) {
    msg = `This needs the ${fn} Edge Function, which isn't deployed yet (run: supabase functions deploy ${fn}).`;
  }
  return msg;
}

/** Map the editable profile fields onto a `user_profiles` row. */
function profileRow(patch: UpdateUserInput, actorId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.role !== undefined) {
    row.role = patch.role;
    row.role_updated_by = actorId; // last_role_update is stamped by the DB trigger
  }
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.assigned_brand !== undefined) row.assigned_brand = patch.assigned_brand;
  if (patch.assigned_outlet !== undefined) row.assigned_outlet = patch.assigned_outlet;
  if (patch.brand_scope !== undefined) row.brand_scope = patch.brand_scope;
  if (patch.selected_brand_ids !== undefined) row.selected_brand_ids = patch.selected_brand_ids;
  if (patch.outlet_scope !== undefined) row.outlet_scope = patch.outlet_scope;
  if (patch.selected_outlet_ids !== undefined) row.selected_outlet_ids = patch.selected_outlet_ids;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.avatar_url !== undefined) row.avatar_url = patch.avatar_url;
  if (patch.last_login !== undefined) row.last_login = patch.last_login;
  if (patch.accessible_brands !== undefined) row.accessible_brands = patch.accessible_brands;
  if (patch.show_cost !== undefined) row.show_cost = patch.show_cost;
  if (patch.dashboard_access !== undefined) row.dashboard_access = patch.dashboard_access;
  if (patch.approved !== undefined) row.approved = patch.approved;
  return row;
}

/**
 * Data-Import and Wastage grants are applied as separate, best-effort updates so
 * the main save never breaks if those columns haven't been migrated yet
 * (db/migrations/0030, 0032). Once migrated, they persist normally.
 */
async function applyGrants(id: string, patch: UpdateUserInput, profile: ProfileRow): Promise<ProfileRow> {
  let current = profile;
  for (const column of ["can_import", "can_manage_wastage"] as const) {
    const value = patch[column];
    if (value === undefined) continue;
    const r = await client()
      .from("user_profiles")
      .update({ [column]: value })
      .eq("id", id)
      .select("*")
      .single<ProfileRow>();
    if (!r.error && r.data) current = r.data;
  }
  return current;
}

export const supabaseUsersRepo = {
  async list(): Promise<User[]> {
    const { data, error } = await client()
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail("Load users", error.message);
    return (data as ProfileRow[]).map(profileToUser);
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await client()
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle<ProfileRow>();
    if (error) fail("Load user", error.message);
    return data ? profileToUser(data) : null;
  },

  /**
   * Create a user in two steps, because the browser can't mint a Supabase auth
   * account: the create-user Edge Function (service role) makes the account with
   * the temporary password — the 0007 trigger gives it a pending `viewer` profile —
   * and then the role, status and access chosen here are applied from the browser,
   * under the admin's own session, so RLS, the super-admin trigger (0015/0019) and
   * the Activity Log all see the real actor.
   *
   * If that second step is refused, the half-made account is deleted again, so a
   * failed create never leaves a stray pending viewer behind.
   */
  async create(input: CreateUserInput, actorId: string): Promise<User> {
    const { data, error } = await client().functions.invoke("create-user", {
      body: { email: input.email, password: input.password, name: input.name, role: input.role },
    });
    if (error) fail("Create user", await functionError(error, "create-user"));
    const res = data as { ok?: boolean; error?: string; userId?: string } | null;
    if (!res?.ok || !res.userId) fail("Create user", res?.error || "Create user failed");
    const id = res.userId;

    const patch: UpdateUserInput = {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status ?? "active",
      approved: true, // an admin is creating this account → pre-approved
      assigned_brand: input.assigned_brand ?? null,
      assigned_outlet: input.assigned_outlet ?? null,
      brand_scope: input.brand_scope ?? null,
      selected_brand_ids: input.selected_brand_ids,
      outlet_scope: input.outlet_scope ?? null,
      selected_outlet_ids: input.selected_outlet_ids,
      accessible_brands: input.accessible_brands,
      can_import: input.can_import,
      can_manage_wastage: input.can_manage_wastage,
    };

    let profile: ProfileRow;
    try {
      const { data: updated, error: upErr } = await client()
        .from("user_profiles")
        .update(profileRow(patch, actorId))
        .eq("id", id)
        .select("*")
        .single<ProfileRow>();
      if (upErr) throw new Error(upErr.message);
      profile = await applyGrants(id, patch, updated as ProfileRow);
    } catch (e) {
      const reason = e instanceof Error ? e.message : "The role and access couldn't be saved";
      let rolledBack = true;
      try {
        await this.remove(id, actorId);
      } catch {
        rolledBack = false; // say so below — a stray account is otherwise invisible
      }
      fail(
        "Create user",
        rolledBack
          ? `${reason} — the account was not created.`
          : `${reason}. The account ${input.email} was created but left as a pending viewer — ` +
            "edit or delete it from User Management.",
      );
    }

    const user = profileToUser(profile);
    await audit({
      entity_type: "user",
      entity_id: id,
      action: "create",
      new_values: { name: user.name, email: user.email, role: user.role, status: user.status },
      performed_by: actorId,
      notes: `Created user ${user.name || user.email} (${user.role}).`,
      after_state: await captureEntity("user", id),
    });
    return user;
  },

  async update(id: string, patch: UpdateUserInput, actorId: string): Promise<User> {
    if (patch.password) {
      fail("Update user", "Passwords are managed by Supabase — use “Send Password Reset”.");
    }
    // Snapshot the current values so the activity log can show before → after,
    // and the full profile row so the change can be reverted.
    const existing = await this.getById(id);
    const beforeState = await captureEntity("user", id);

    const { data, error } = await client()
      .from("user_profiles")
      .update(profileRow(patch, actorId))
      .eq("id", id)
      .select("*")
      .single<ProfileRow>();
    if (error) fail("Update user", error.message);
    const profile = await applyGrants(id, patch, data as ProfileRow);
    const user = profileToUser(profile);

    // Activity log — role/status/permission changes were previously invisible in
    // the Supabase path (the mock repo has always recorded them).
    const tracked = [
      "name", "email", "role", "status", "approved", "assigned_brand", "assigned_outlet",
      "brand_scope", "outlet_scope", "show_cost", "dashboard_access", "can_import",
      "can_manage_wastage",
    ] as const;
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const k of tracked) {
      const next = (patch as Record<string, unknown>)[k];
      const prev = (existing as unknown as Record<string, unknown> | null)?.[k];
      if (next !== undefined && next !== prev) {
        before[k] = prev ?? null;
        after[k] = next;
      }
    }
    if (Object.keys(after).length) {
      const roleChange =
        after.role !== undefined ? ` Role changed ${before.role ?? "—"} → ${after.role}.` : "";
      await audit({
        entity_type: "user",
        entity_id: id,
        action: "update",
        old_values: before,
        new_values: after,
        performed_by: actorId,
        notes: `Updated ${user.name || user.email} (${Object.keys(after).join(", ")}).${roleChange}`,
        before_state: beforeState,
        after_state: await captureEntity("user", id),
      });
    }
    return user;
  },

  /**
   * Permanently delete a user via the delete-user Edge Function (service role) —
   * the browser can't remove a Supabase auth account itself. Guards (self-delete,
   * super-admin, last admin/super) are enforced server-side in the function.
   */
  async remove(id: string, _actorId: string): Promise<void> {
    const { data, error } = await client().functions.invoke("delete-user", {
      body: { userId: id },
    });
    if (error) fail("Delete user", await functionError(error, "delete-user"));
    const res = data as { ok?: boolean; error?: string } | null;
    if (!res?.ok) fail("Delete user", res?.error || "Delete user failed");
  },
};
