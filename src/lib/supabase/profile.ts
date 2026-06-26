import { supabase } from "./client";
import { profileToUser, type ProfileRow } from "./types";
import type { User } from "@/lib/data/types";

/**
 * Load the app `User` for an authenticated Supabase uid from the profiles table.
 * Throws if the profile is missing or the account is deactivated.
 * Only call when `isSupabaseConfigured` is true (supabase is non-null).
 */
export async function hydrateUserFromProfile(uid: string): Promise<User> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single<ProfileRow>();
  if (error || !data) throw new Error("Profile not found. Contact an admin.");
  if (data.status === "inactive") {
    await supabase.auth.signOut();
    throw new Error("Your account has been deactivated. Contact admin.");
  }
  return profileToUser(data);
}

/** Patch the current user's own profile row (name/phone/avatar). */
export async function updateOwnProfile(
  uid: string,
  patch: Partial<Pick<ProfileRow, "name" | "phone" | "avatar_url" | "theme_pref">>,
): Promise<User> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", uid)
    .select("*")
    .single<ProfileRow>();
  if (error || !data) throw new Error(error?.message ?? "Profile update failed");
  return profileToUser(data);
}

/** Fire-and-forget: persist the chosen theme to the user's profile. */
export function syncThemePref(uid: string, theme: string): void {
  if (!supabase) return;
  supabase
    .from("profiles")
    .update({ theme_pref: theme })
    .eq("id", uid)
    .then(
      ({ error }) => error && console.error("Theme sync failed:", error),
      (err) => console.error("Theme sync failed:", err),
    );
}

/** Stamp last_login after a successful sign-in (best-effort). */
export function stampLastLogin(uid: string): void {
  if (!supabase) return;
  supabase
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", uid)
    .then(
      ({ error }) => error && console.error("Last-login stamp failed:", error),
      (err) => console.error("Last-login stamp failed:", err),
    );
}
