// Supabase Edge Function: mcp-pair
// -----------------------------------------------------------------------------
// Redeems a one-time pairing code (generated on the website, Profile → AI
// Assistant) and returns a sign-in token for THAT user, so their AI assistant's
// connector can act as them without anyone typing a password into a terminal.
//
// The code is single-use and expires in minutes (0038_mcp_pairing.sql stores only
// its SHA-256). Redeeming requires the service role, which is why this runs here
// and not in the connector.
//
// Deploy:
//   supabase functions deploy mcp-pair --no-verify-jwt
// (--no-verify-jwt: the connector has no session yet — the code IS the credential.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let code: string | undefined;
  try {
    ({ code } = await req.json());
  } catch {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }
  if (!code || typeof code !== "string") return json({ ok: false, error: "Pairing code is required" }, 400);

  const codeHash = await sha256Hex(code.trim().toUpperCase());
  const { data: row, error } = await admin
    .from("mcp_pairing_codes")
    .select("id, user_id, expires_at, used_at")
    .eq("code_hash", codeHash)
    .maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!row) return json({ ok: false, error: "That pairing code isn't valid. Generate a new one." });
  if (row.used_at) return json({ ok: false, error: "That pairing code has already been used." });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return json({ ok: false, error: "That pairing code has expired. Generate a new one." });
  }

  // Burn the code first: a failure after this point must not leave it reusable.
  const { error: burnErr } = await admin
    .from("mcp_pairing_codes")
    .update({ used_at: new Date().toISOString(), used_ip: req.headers.get("x-forwarded-for") })
    .eq("id", row.id)
    .is("used_at", null);
  if (burnErr) return json({ ok: false, error: burnErr.message }, 500);

  const { data: profile } = await admin
    .from("user_profiles")
    .select("email, name, role, status")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!profile?.email) return json({ ok: false, error: "That account no longer exists." });
  if (profile.status === "inactive") return json({ ok: false, error: "That account is deactivated." });

  // A magic-link token the connector exchanges for a session via verifyOtp.
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });
  if (linkErr || !link?.properties?.hashed_token) {
    return json({ ok: false, error: linkErr?.message ?? "Could not create a session" }, 500);
  }

  return json({
    ok: true,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    token_hash: link.properties.hashed_token,
  });
});
