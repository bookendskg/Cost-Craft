import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from "firebase/auth";

// Firebase web config (public by design — these are NOT secrets). Provide via
// VITE_FIREBASE_* env vars. When absent, the app transparently falls back to the
// Supabase or mock auth layer, so builds run before a Firebase project exists.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
if (isFirebaseConfigured) {
  app = initializeApp(config);
  authInstance = getAuth(app);
  // Persist the session across reloads/tabs (PRD §8 session persistence).
  void setPersistence(authInstance, browserLocalPersistence);
}

/** The Firebase Auth instance, or null in fallback mode. Go through
 *  src/lib/firebase/auth.ts and src/lib/auth/session.ts — never import directly. */
export const firebaseAuth: Auth | null = authInstance;
