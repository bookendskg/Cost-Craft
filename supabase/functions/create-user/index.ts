// Supabase Edge Function: create-user
// -----------------------------------------------------------------------------
// The browser CANNOT mint a Supabase auth account for someone else (that needs the
// service_role key, which must never ship to the client) — which is why the admin
// "Create User" page used to fail with "users self-register…". This function runs
// server-side with the service key and creates the account:
//
//   auth.admin.createUser(email, password, email_confirm: true)
//     → the on_auth_user_created trigger (0007) inserts public.user_profiles
//       with role 'viewer', approved = false
//     → the CALLER then applies role / status / scope from the browser, through
//       their own session, so RLS and the super-admin trigger (0015/0019) see the
//       real actor and the Activity Log records who did it.
//
// It re-checks authorization server-side (never trust the client):
//   • caller must be an active admin or super_admin,
//   • only a super_admin may create a super_admin,
//   • the email must not already have an account.
//
// Because the role is applied afterwards by the client, the account is created as
// a pending viewer first. If that second step fails, the client rolls the account
// back with delete-user — see supabaseUsersRepo.create.
//
// Returns HTTP 200 with { ok: false, error } for handled failures so the client can
// show a precise message, and { ok: true, userId } on success.
//
// Deploy:
//   supabase functions deploy create-user
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Admin client (service role) — bypasses RLS; used for the checks + the create.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  // Caller client — carries the caller's JWT so we can identify them.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: authData, error: authErr } = await caller.auth.getUser();
  if (authErr || !authData?.user) return json({ ok: false, error: "Not authenticated" }, 401);
  const callerId = authData.user.id;

  let body: { email?: string; password?: string; name?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request body" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim();
  const role = body.role ?? "viewer";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "A valid email address is required" });
  }
  if (password.length < 8) return json({ ok: false, error: "The password must be at least 8 characters" });

  const { data: callerProfile } = await admin
    .from("user_profiles")
    .select("role, status")
    .eq("id", callerId)
    .maybeSingle();
  const callerRole = callerProfile?.role as string | undefined;
  if (!callerProfile || callerProfile.status !== "active" || (callerRole !== "admin" && callerRole !== "super_admin")) {
    return json({ ok: false, error: "Only an active Admin or Super Admin can create users" }, 403);
  }
  if (role === "super_admin" && callerRole !== "super_admin") {
    return json({ ok: false, error: "Only a Super Admin can create a Super Admin user" });
  }

  // A pending self-signup with this email already exists? Approving it is the right
  // move — creating a second account for the same person isn't possible anyway.
  const { data: existing } = await admin
    .from("user_profiles")
    .select("id, approved, status")
    .ilike("email", email)
    .maybeSingle();
  if (existing) {
    return json({
      ok: false,
      error:
        existing.approved === false
          ? `${email} has already signed up and is waiting for approval — approve them in User Management instead of creating a new account.`
          : `${email} already has an account.`,
    });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // an admin vouches for the address; no confirmation mail
    user_metadata: name ? { name } : undefined,
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Could not create the account";
    return json({
      ok: false,
      error: /already been registered|already exists/i.test(msg)
        ? `${email} already has an account.`
        : msg,
    });
  }

  // The trigger has inserted the profile; stamp who created it. Role, status and
  // scope are applied by the caller next, under their own session.
  await admin
    .from("user_profiles")
    .update({ name: name || undefined, created_by: callerId })
    .eq("id", created.user.id);

  return json({ ok: true, userId: created.user.id });
});
