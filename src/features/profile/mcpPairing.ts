// One-time codes that connect a person's AI assistant to KostKraft (0038).
//
// The website generates the code and stores only its SHA-256, so the row can't be
// redeemed by anyone who reads the table. The assistant's connector exchanges the
// code for a session through the mcp-pair Edge Function — no password is ever typed
// into a terminal or shown to the assistant.

import { supabase } from "@/lib/supabase/client";

/** How long a code stays usable. Short: it's pasted straight into an assistant. */
export const CODE_TTL_MINUTES = 15;

// No ambiguous characters (0/O, 1/I) — these get read aloud and retyped.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const raw = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PairingCode {
  code: string;
  expiresAt: string;
}

/** Create a pairing code for the signed-in user. Returns the code ONCE — it isn't stored. */
export async function createPairingCode(userId: string, label?: string): Promise<PairingCode> {
  if (!supabase) throw new Error("Connecting an assistant needs the live app.");
  const code = randomCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  const { error } = await supabase.from("mcp_pairing_codes").insert({
    user_id: userId,
    code_hash: await sha256Hex(code),
    label: label ?? null,
    expires_at: expiresAt,
  });
  if (error) {
    throw new Error(
      /relation .* does not exist/i.test(error.message)
        ? "Assistant pairing isn't set up yet — a Super Admin needs to run migration 0038."
        : error.message,
    );
  }
  return { code, expiresAt };
}

/** The whole setup, as one block to paste into Claude (or any agent with a terminal). */
export function setupPrompt(origin: string, code: string): string {
  return [
    "Set up the KostKraft MCP connector on this computer for me:",
    "",
    `1. Download ${origin}/mcp/kostkraft-mcp.mjs to ~/.kostkraft/kostkraft-mcp.mjs`,
    `2. Run: node ~/.kostkraft/kostkraft-mcp.mjs pair ${code}`,
    "3. Run: node ~/.kostkraft/kostkraft-mcp.mjs config",
    "   and add the printed MCP server config to my AI client's config file",
    "   (Claude Code: `claude mcp add kostkraft -- node ~/.kostkraft/kostkraft-mcp.mjs serve`).",
    "4. Reconnect/restart so the kostkraft tools load, then call `whoami` to confirm.",
    "",
    `Notes: the pairing code is single-use and expires in ${CODE_TTL_MINUTES} minutes.`,
    "It signs you in as me, so the tools can only do what my KostKraft role allows,",
    "and every change is recorded in the Activity Log under my name.",
  ].join("\n");
}
