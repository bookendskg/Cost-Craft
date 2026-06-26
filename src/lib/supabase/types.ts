import type { Brand, Role, User, UserStatus } from "@/lib/data/types";

/** A row in the Supabase `public.profiles` table (see db/migrations/0002). */
export interface ProfileRow {
  id: string; // = auth.users.id
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  phone: string | null;
  avatar_url: string | null;
  accessible_brands: Brand[] | null;
  show_cost: boolean | null;
  theme_pref: string | null; // 'light' | 'dark' | 'capiche' | 'aiko'
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map a profiles row to the app `User` the rest of the app already consumes.
 * This is the seam that keeps `permissions.ts` and every `useSession(s => s.user)`
 * reader unchanged when running against Supabase.
 */
export function profileToUser(p: ProfileRow): User {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    status: p.status,
    phone: p.phone,
    avatar_url: p.avatar_url,
    last_login: p.last_login,
    theme_pref: p.theme_pref,
    accessible_brands: p.accessible_brands ?? undefined,
    show_cost: p.show_cost ?? undefined,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}
