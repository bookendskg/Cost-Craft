import { onAuthStateChanged } from "firebase/auth";
import { isFirebaseConfigured, firebaseAuth } from "../firebase/client";
import { linkFirebaseUser } from "../data";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { hydrateUserFromProfile, syncThemePref } from "../supabase/profile";
import { useSession } from "./session";
import { useTheme, type Theme } from "../theme";

const VALID_THEMES: Theme[] = ["light", "dark"];

async function applyProfile(uid: string) {
  try {
    const user = await hydrateUserFromProfile(uid);
    useSession.getState().setUser(user);
    // Follow the user's saved theme across devices (best-effort).
    const pref = user.theme_pref;
    if (pref && (VALID_THEMES as string[]).includes(pref)) {
      useTheme.getState().setTheme(pref as Theme);
    }
  } catch (err) {
    console.error("Failed to hydrate user profile:", err);
    useSession.getState().setUser(null);
  }
}

/**
 * One-time auth bootstrap. No-op in mock mode. In Supabase mode it hydrates the
 * session on cold load and keeps it in sync via onAuthStateChange (token refresh,
 * sign-in, sign-out, password recovery).
 */
export function initAuth() {
  // Firebase Authentication (preferred). Hydrates the profile by UID/email on
  // cold load and on every auth state change (sign-in/out, token refresh).
  if (isFirebaseConfigured && firebaseAuth) {
    onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        useSession.getState().setUser(null);
        return;
      }
      try {
        const user = await linkFirebaseUser(fbUser.uid, fbUser.email ?? "", fbUser.displayName, fbUser.emailVerified);
        useSession.getState().setUser(user);
        const pref = user.theme_pref;
        if (pref && (VALID_THEMES as string[]).includes(pref)) {
          useTheme.getState().setTheme(pref as Theme);
        }
      } catch (err) {
        console.error("Failed to map Firebase user:", err);
        useSession.getState().setUser(null);
      }
    });
    return;
  }

  if (!isSupabaseConfigured || !supabase) return;

  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user) void applyProfile(data.session.user.id);
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session?.user) {
      useSession.getState().setUser(null);
      return;
    }
    void applyProfile(session.user.id);
  });

  // Persist theme changes to the signed-in user's profile (best-effort).
  useTheme.subscribe((state, prev) => {
    if (state.theme === prev.theme) return;
    const uid = useSession.getState().user?.id;
    if (uid) syncThemePref(uid, state.theme);
  });
}
