import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "../data/types";
import { authenticate } from "../data";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { onSignIn } from "../supabase/profile";

interface SessionState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      error: null,
      async login(email, password) {
        set({ loading: true, error: null });
        try {
          // Supabase Authentication (preferred). Profiles/roles live in user_profiles.
          if (isSupabaseConfigured && supabase) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw new Error(friendlyAuthError(error.message));
            const user = await onSignIn(); // stamps last_login + owner promotion + verification
            set({ user, loading: false });
            return user;
          }
          // ── Mock fallback (local dev without Supabase) ──
          const user = await authenticate(email, password);
          set({ user, loading: false });
          return user;
        } catch (e) {
          const message = e instanceof Error ? e.message : "Login failed";
          set({ error: message, loading: false });
          throw e;
        }
      },
      async logout() {
        if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        set({ user: null, error: null });
      },
      setUser(user) {
        set({ user });
      },
    }),
    {
      name: "rcms.session",
      // In Supabase mode the source of truth is supabase.auth; persisting `user`
      // is just a first-paint optimisation re-validated by onAuthStateChange.
      partialize: (s) => ({ user: s.user }),
    },
  ),
);

/** Turn raw Supabase auth errors into friendlier copy. */
function friendlyAuthError(message: string): string {
  if (/email not confirmed/i.test(message)) {
    return "Please confirm your email first — check your inbox for the verification link.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Invalid email or password";
  }
  return message;
}
