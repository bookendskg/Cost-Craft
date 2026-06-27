import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as fbSignOutFn,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "./client";

/** Map raw Firebase error codes to friendly, user-safe messages (PRD §8/§41). */
export function friendlyFirebaseError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password";
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again in a few minutes.";
    case "auth/user-disabled":
      return "Your account is disabled. Please contact an administrator.";
    case "auth/invalid-email":
      return "Enter a valid email address";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Authentication failed. Please try again.";
  }
}

const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    throw new Error(friendlyFirebaseError(code));
  }
};

export async function firebaseSignIn(email: string, password: string): Promise<FirebaseUser> {
  const auth = firebaseAuth;
  if (!auth) throw new Error("Firebase not configured");
  return wrap(async () => (await signInWithEmailAndPassword(auth, email, password)).user);
}

/** Create the account and send a verification email (best-effort). */
export async function firebaseSignUp(email: string, password: string): Promise<FirebaseUser> {
  const auth = firebaseAuth;
  if (!auth) throw new Error("Firebase not configured");
  return wrap(async () => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.error("Verification email failed:", err);
    }
    return cred.user;
  });
}

export async function firebaseResetPassword(email: string): Promise<void> {
  const auth = firebaseAuth;
  if (!auth) throw new Error("Firebase not configured");
  return wrap(() => sendPasswordResetEmail(auth, email));
}

export async function firebaseLogout(): Promise<void> {
  if (firebaseAuth) await fbSignOutFn(firebaseAuth);
}

export async function resendVerification(): Promise<void> {
  if (firebaseAuth?.currentUser) await sendEmailVerification(firebaseAuth.currentUser);
}
