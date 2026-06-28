import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { firebaseAuth } from "@/lib/firebase/client";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Phase 1 backend flag. The Supabase-backed `user_profiles` store is used ONLY
 * when Supabase is configured AND `VITE_USERS_BACKEND=supabase`. Otherwise the
 * app keeps using the mock/localStorage users repo, so nothing changes until the
 * Supabase project + Firebase third-party auth are set up and the flag is flipped.
 */
export const isSupabaseUsersBackend =
  Boolean(url && anonKey) && import.meta.env.VITE_USERS_BACKEND === "supabase";

/**
 * A Supabase client that authenticates every request with the current FIREBASE
 * ID token (Supabase third-party auth). Inside RLS, `auth.jwt() ->> 'sub'` is then
 * the Firebase UID and `auth.jwt() ->> 'email'` the verified email — which the
 * `user_profiles` policies (db/migrations/0007) key on.
 *
 * Kept separate from the legacy `supabase` auth client (src/lib/supabase/client.ts)
 * so the Firebase-token transport never conflicts with Supabase's own auth session.
 */
export const supabaseData: SupabaseClient | null = isSupabaseUsersBackend
  ? createClient(url!, anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      accessToken: async () => {
        const u = firebaseAuth?.currentUser;
        return u ? await u.getIdToken() : null;
      },
    })
  : null;
