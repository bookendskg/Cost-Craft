// Supabase Edge Function: mcp-http
// -----------------------------------------------------------------------------
// The HOSTED MCP server — for ChatGPT and any other client that can only reach a
// URL. Same tools as the local connector (they share mcp/src/tools.ts, pre-bundled
// into _bundle.js), same safety rules.
//
// Authentication is a personal connector token (0039_mcp_tokens.sql), sent either
// as `Authorization: Bearer kk_…` (Claude Code, scripts) or as the last path
// segment — `…/mcp-http/kk_…` — because ChatGPT's custom-connector dialog offers
// only "OAuth" or "No authentication" and has nowhere to put a token. The URL form
// means the link itself is the credential: treat it like a password, and revoke it
// from Profile → AI Assistant if it ever leaks. The function looks the token up with the service
// role, mints a SHORT-LIVED JWT for that user, and runs the request with it — so
// row-level security, the user's KostKraft role, the Activity Log attribution and
// revert all behave exactly as they do in the browser. The service role is used
// only to resolve the token, never to touch costing data.
//
// Requests are handled one at a time: the bundled repos read a single "current
// client" slot, so overlapping requests could otherwise cross wires.
//
// Setup:
//   supabase secrets set MCP_JWT_SECRET="$(the project's JWT secret)"
//   supabase functions deploy mcp-http --no-verify-jwt
// (--no-verify-jwt: the connector token IS the credential; this function checks it.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create as createJwt, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import {
  handleJsonRpc,
  makeUserClient,
  setActor,
  setRequestClient,
  type JsonRpcRequest,
} from "./_bundle.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, mcp-protocol-version, mcp-session-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const rpcError = (id: string | number | null, code: number, message: string, status = 200) =>
  json({ jsonrpc: "2.0", id, error: { code, message } }, status);

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const jwtSecret = Deno.env.get("MCP_JWT_SECRET") ?? "";

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** A 5-minute access token for this user, so the repos run under their own RLS. */
async function mintUserJwt(userId: string, email: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return await createJwt(
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      email,
      role: "authenticated",
      aud: "authenticated",
      iss: `${url}/auth/v1`,
      exp: getNumericDate(5 * 60),
      iat: getNumericDate(0),
    },
    key,
  );
}

interface Caller {
  userId: string;
  email: string;
  name: string;
  role: string;
  tokenId: string;
}

/** The token from the Authorization header, or from the end of the URL path. */
function readToken(req: Request): string {
  const header = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (header) return header;
  // /functions/v1/mcp-http/<token>
  const tail = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";
  return tail === "mcp-http" ? "" : decodeURIComponent(tail);
}

async function resolveToken(token: string): Promise<Caller | { error: string }> {
  if (!token) {
    return {
      error:
        "Missing connector token. Send it as a Bearer token, or use the personal URL from KostKraft → Profile → AI Assistant.",
    };
  }

  const { data: row, error } = await admin
    .from("mcp_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", await sha256Hex(token))
    .maybeSingle();
  if (error) return { error: error.message };
  if (!row || row.revoked_at) return { error: "That connector token isn't valid. Create a new one in KostKraft." };

  const { data: profile } = await admin
    .from("user_profiles")
    .select("email, name, role, status")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!profile) return { error: "That account no longer exists." };
  if (profile.status === "inactive") return { error: "That KostKraft account is deactivated." };

  return {
    userId: row.user_id,
    email: profile.email ?? "",
    name: profile.name ?? profile.email ?? "",
    role: profile.role ?? "",
    tokenId: row.id,
  };
}

// One request at a time — the bundled repos share a single client slot.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Streamable HTTP allows GET for server-initiated streams; this server has none.
  if (req.method === "GET") return json({ status: "ok", transport: "streamable-http (stateless)" });
  if (req.method !== "POST") return rpcError(null, -32600, "Method not allowed", 405);
  if (!jwtSecret) return rpcError(null, -32603, "Server not configured: MCP_JWT_SECRET is missing", 500);

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const caller = await resolveToken(readToken(req));
  if ("error" in caller) return rpcError(null, -32001, caller.error, 401);

  return await serialize(async () => {
    const accessToken = await mintUserJwt(caller.userId, caller.email);
    setRequestClient(makeUserClient(url, anonKey, accessToken));
    setActor({ userId: caller.userId, email: caller.email, name: caller.name, role: caller.role });
    try {
      const messages = Array.isArray(body) ? body : [body];
      const replies = [];
      for (const message of messages) {
        const reply = await handleJsonRpc(message);
        if (reply) replies.push(reply);
      }
      // Best-effort usage stamp; never fails the call.
      admin.from("mcp_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", caller.tokenId).then(
        () => undefined,
        () => undefined,
      );
      if (!replies.length) return new Response(null, { status: 202, headers: cors });
      return json(Array.isArray(body) ? replies : replies[0]);
    } finally {
      setRequestClient(null);
    }
  });
});
