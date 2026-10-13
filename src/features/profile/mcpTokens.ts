// Personal connector tokens for the HOSTED MCP server (0039).
//
// ChatGPT and other URL-only clients can't run the local connector, so each person
// issues a token here and pastes it into their client. Only its SHA-256 is stored —
// the token itself is shown once and never again.

import { supabase } from "@/lib/supabase/client";

export interface McpToken {
  id: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** Readable but unguessable: 32 base32-ish chars after a recognisable prefix. */
function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  return `kk_${[...bytes].map((b) => alphabet[b % alphabet.length]).join("")}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function client() {
  if (!supabase) throw new Error("Connecting an assistant needs the live app.");
  return supabase;
}

const missingTable = (message: string) =>
  /relation .* does not exist/i.test(message)
    ? "Hosted connections aren't set up yet — a Super Admin needs to run migration 0039."
    : message;

/** Create a token for the signed-in user. The plain token is returned ONCE. */
export async function createToken(userId: string, name: string): Promise<string> {
  const token = randomToken();
  const { error } = await client()
    .from("mcp_tokens")
    .insert({ user_id: userId, token_hash: await sha256Hex(token), name: name.trim() || "Assistant" });
  if (error) throw new Error(missingTable(error.message));
  return token;
}

export async function listTokens(userId: string): Promise<McpToken[]> {
  const { data, error } = await client()
    .from("mcp_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(missingTable(error.message));
  return (data ?? []) as McpToken[];
}

export async function revokeToken(id: string): Promise<void> {
  const { error } = await client().from("mcp_tokens").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** The hosted server's URL, derived from the project this app talks to. */
export function hostedUrl(): string {
  const base = (import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return base ? `${base}/functions/v1/mcp-http` : "";
}
