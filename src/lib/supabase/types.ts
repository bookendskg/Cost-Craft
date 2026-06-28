import type { Brand, Role, User, UserStatus } from "@/lib/data/types";

/** A row in the Supabase `public.user_profiles` table (see db/migrations/0007). */
export interface ProfileRow {
  id: string; // = auth.users.id
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
  theme_pref: string | null; // 'light' | 'dark' | 'capiche' | 'aiko'
  last_login: string | null;
  last_role_update: string | null;
  role_updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a user_profiles row to the app `User` the rest of the app consumes. This is
 * the seam that keeps `permissions.ts` and every `useSession(s => s.user)` reader
 * unchanged between the mock and Supabase backends.
 */
export function profileToUser(p: ProfileRow): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    status: p.status,
    approved: p.approved,
    email_verified: p.email_verified,
    phone: p.phone,
    avatar_url: p.avatar_url,
    assigned_brand: p.assigned_brand,
    assigned_outlet: p.assigned_outlet,
    accessible_brands: p.accessible_brands ?? undefined,
    show_cost: p.show_cost ?? undefined,
    dashboard_access: p.dashboard_access,
    theme_pref: p.theme_pref,
    last_login: p.last_login,
    last_role_update: p.last_role_update,
    role_updated_by: p.role_updated_by,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}
