// Node stand-in for src/lib/supabase/client.ts.
//
// The app's repos (src/lib/data/supabase/*) import that module, which reads
// import.meta.env — Vite-only. The build aliases "@/lib/supabase/client" to this
// file so the MCP server can reuse the repos UNCHANGED: every write then runs the
// same cost cascade, price history, audit trail and revert snapshots as the app.
//
// The client is signed in as the person running the server (never the service-role
// key), so Supabase row-level security and their KostKraft role apply exactly as
// they do in the browser, and the Activity Log attributes the change to them.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadSession, saveSession } from "./credentials.js";

const url = process.env.KOSTKRAFT_SUPABASE_URL ?? "";
const anonKey = process.env.KOSTKRAFT_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);
/** Always the real backend here — the MCP server has no local mock store. */
export const isSupabaseDataBackend = isSupabaseConfigured;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        // The CLI owns the token file; supabase-js must not try to use browser storage.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;

export function requireClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "KOSTKRAFT_SUPABASE_URL and KOSTKRAFT_SUPABASE_ANON_KEY must be set (see mcp/README.md).",
    );
  }
  return supabase;
}

/** Sign in with the stored refresh token. Throws with a clear next step if absent. */
export async function restoreSession(): Promise<{ userId: string; email: string }> {
  const client = requireClient();
  const stored = await loadSession();
  if (!stored) {
    throw new Error("Not signed in. Run `kostkraft-mcp login` first.");
  }
  const { data, error } = await client.auth.refreshSession({ refresh_token: stored.refreshToken });
  if (error || !data.session) {
    throw new Error(`Sign-in expired — run \`kostkraft-mcp login\` again. (${error?.message ?? "no session"})`);
  }
  // Rotate: Supabase hands back a new refresh token on every refresh.
  await saveSession({ refreshToken: data.session.refresh_token });
  return { userId: data.session.user.id, email: data.session.user.email ?? "" };
}
