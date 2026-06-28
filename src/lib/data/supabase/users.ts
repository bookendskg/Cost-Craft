// Supabase-backed users repository (Phase 1). Mirrors the mock `usersRepo` +
// `linkFirebaseUser` interface so feature code is unchanged — selection happens in
// src/lib/data/index.ts via the VITE_USERS_BACKEND flag. Backed by the
// `public.user_profiles` table + `link_firebase_identity` RPC (db/migrations/0007),
// with access enforced by RLS keyed on the Firebase ID token.

import { supabaseData } from "@/lib/supabase/dataClient";
import type { Brand, Role, User, UserStatus } from "../types";
import type { CreateUserInput, UpdateUserInput } from "../mock/users";

/** A row of public.user_profiles. */
interface UserProfileRow {
  id: string;
  firebase_uid: string | null;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  approved: boolean;
  email_verified: boolean;
  phone: string | null;
  avatar_url: string | null;
  assigned_brand: Brand | null;
  assigned_outlet: string | null;
  accessible_brands: Brand[] | null;
  show_cost: boolean | null;
  dashboard_access: boolean;
  theme_pref: string | null;
  last_login: string | null;
  last_role_update: string | null;
  role_updated_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToUser(r: UserProfileRow): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    firebase_uid: r.firebase_uid,
    email_verified: r.email_verified,
    approved: r.approved,
    phone: r.phone,
    avatar_url: r.avatar_url,
    assigned_brand: r.assigned_brand,
    assigned_outlet: r.assigned_outlet,
    accessible_brands: r.accessible_brands ?? undefined,
    show_cost: r.show_cost ?? undefined,
    dashboard_access: r.dashboard_access,
    theme_pref: r.theme_pref,
    last_login: r.last_login,
    last_role_update: r.last_role_update,
    role_updated_by: r.role_updated_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** Translate a Postgres/RLS error into something user-facing. */
function fail(context: string, message?: string): never {
  throw new Error(message || `${context} failed`);
}

function client() {
  if (!supabaseData) fail("Supabase users backend is not configured");
  return supabaseData;
}

export const supabaseUsersRepo = {
  async list(): Promise<User[]> {
    const { data, error } = await client()
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) fail("Load users", error.message);
    return (data as UserProfileRow[]).map(rowToUser);
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await client()
      .from("user_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail("Load user", error.message);
    return data ? rowToUser(data as UserProfileRow) : null;
  },

  async create(input: CreateUserInput, actorId: string): Promise<User> {
    const { data, error } = await client()
      .from("user_profiles")
      .insert({
        name: input.name,
        email: input.email,
        role: input.role,
        status: input.status ?? "active",
        assigned_brand: input.assigned_brand ?? null,
        assigned_outlet: input.assigned_outlet ?? null,
        approved: true, // an admin is creating this account → pre-approved
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) fail("Create user", error.message);
    return rowToUser(data as UserProfileRow);
  },

  async update(id: string, patch: UpdateUserInput, actorId: string): Promise<User> {
    // Passwords are owned by Firebase, not the profile table. Surface this rather
    // than silently dropping a typed password (use "Send Password Reset" instead).
    if (patch.password) {
      fail("Update user", "Passwords are managed by Firebase — use “Send Password Reset”.");
    }
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
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.avatar_url !== undefined) row.avatar_url = patch.avatar_url;
    if (patch.last_login !== undefined) row.last_login = patch.last_login;
    if (patch.accessible_brands !== undefined) row.accessible_brands = patch.accessible_brands;
    if (patch.show_cost !== undefined) row.show_cost = patch.show_cost;
    if (patch.dashboard_access !== undefined) row.dashboard_access = patch.dashboard_access;
    if (patch.approved !== undefined) row.approved = patch.approved;

    const { data, error } = await client()
      .from("user_profiles")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) fail("Update user", error.message);
    return rowToUser(data as UserProfileRow);
  },
};

/**
 * Map the signed-in Firebase identity to a `user_profiles` row via the
 * `link_firebase_identity` RPC. The UID + email are read server-side from the
 * verified token (the function ignores anything spoofable), so we only forward the
 * display name + verification flag. Throws if the account is disabled.
 */
export async function linkFirebaseUserSupabase(
  _firebaseUid: string,
  _email: string,
  displayName?: string | null,
  emailVerified?: boolean,
): Promise<User> {
  const { data, error } = await client().rpc("link_firebase_identity", {
    p_name: displayName ?? null,
    p_email_verified: emailVerified ?? false,
  });
  if (error) fail("Sign-in", error.message);
  // The RPC returns a single user_profiles row.
  const r = (Array.isArray(data) ? data[0] : data) as UserProfileRow | null;
  if (!r) fail("Sign-in", "Could not load your profile");
  return rowToUser(r);
}
