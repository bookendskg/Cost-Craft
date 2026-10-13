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

// Baked in when the connector is built for the deployed site (scripts/build-mcp.mjs),
// so a downloaded file already knows which KostKraft it belongs to. Both values are
// public — the same ones the website ships — and grant nothing without a sign-in.
declare const __KOSTKRAFT_URL__: string | undefined;
declare const __KOSTKRAFT_ANON_KEY__: string | undefined;

const baked = {
  url: typeof __KOSTKRAFT_URL__ === "string" ? __KOSTKRAFT_URL__ : "",
  anonKey: typeof __KOSTKRAFT_ANON_KEY__ === "string" ? __KOSTKRAFT_ANON_KEY__ : "",
};

const url = process.env.KOSTKRAFT_SUPABASE_URL ?? baked.url;
const anonKey = process.env.KOSTKRAFT_SUPABASE_ANON_KEY ?? baked.anonKey;

/** Where this connector points — shown by `whoami` / `config`. */
export const projectUrl = url;

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
      "This connector has no KostKraft project baked in. Re-download it from your KostKraft site " +
        "(Profile → AI Assistant), or set KOSTKRAFT_SUPABASE_URL and KOSTKRAFT_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

/**
 * Redeem a one-time pairing code from the website (Profile → AI Assistant) and store
 * the resulting session. No password is involved: the Edge Function checks the code
 * and hands back a single-use sign-in token for that user.
 */
export async function pairWithCode(code: string): Promise<{ email: string; name: string; role: string }> {
  const client = requireClient();
  const res = await fetch(`${url}/functions/v1/mcp-pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
  const body = (await res.json().catch(() => null)) as
    | { ok: boolean; error?: string; email?: string; name?: string; role?: string; token_hash?: string }
    | null;
  if (!body) throw new Error(`Pairing failed (HTTP ${res.status}).`);
  if (!body.ok || !body.token_hash || !body.email) {
    throw new Error(body.error ?? "Pairing failed. Generate a new code on the website.");
  }

  const { data, error } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: body.token_hash,
  });
  if (error || !data.session) throw new Error(error?.message ?? "Could not start a session.");
  await saveSession({ refreshToken: data.session.refresh_token });
  await client.rpc("on_sign_in");
  return { email: body.email, name: body.name ?? body.email, role: body.role ?? "" };
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
