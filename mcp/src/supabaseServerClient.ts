// Supabase client for the HOSTED server (Supabase Edge Function).
//
// Unlike the local connector, this process serves many people, so there is no
// single signed-in user: the Edge Function mints a short-lived token for whoever
// owns the connector token on the request, builds a client with it, and installs it
// here for the duration of that request. The app's repos then run with that user's
// own permissions — RLS applies, and the Activity Log names them.
//
// Requests are handled one at a time (see supabase/functions/mcp-http/index.ts), so
// this single slot can never serve two people at once.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let current: SupabaseClient | null = null;

/** Install the client for the request being handled. */
export function setRequestClient(client: SupabaseClient | null): void {
  current = client;
}

export function makeUserClient(url: string, anonKey: string, accessToken: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// What the app's repos import (the build aliases @/lib/supabase/client to this).
export const isSupabaseConfigured = true;
export const isSupabaseDataBackend = true;

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!current) throw new Error("No KostKraft session on this request.");
    return Reflect.get(current as object, prop, receiver);
  },
});
