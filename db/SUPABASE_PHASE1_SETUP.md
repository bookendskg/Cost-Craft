# Supabase Backend — Phase 1: User Profiles + RLS

Phase 1 moves the **users/roles** store from the mock/localStorage layer to a real
Supabase table (`public.user_profiles`) with **Row Level Security**, while auth stays
on **Firebase** (via Supabase third-party auth). Every other module (recipes,
materials, yields, wastage, audit) remains on the mock layer for now — Phases 2–3.

It is **off by default**: the app keeps using mock users until you complete the steps
below and set `VITE_USERS_BACKEND=supabase`. Nothing breaks before then.

---

## What ships in the code

| File | Role |
|---|---|
| `db/migrations/0007_user_profiles.sql` | `user_profiles` table, RLS, guard triggers, `link_firebase_identity()` RPC |
| `src/lib/supabase/dataClient.ts` | Supabase client that authenticates with the **Firebase ID token** (`accessToken` hook) |
| `src/lib/data/supabase/users.ts` | `supabaseUsersRepo` + `linkFirebaseUserSupabase` (same interface as the mock repo) |
| `src/lib/data/index.ts` | Picks Supabase vs mock for `usersRepo`/`linkFirebaseUser` via the flag |

## Console steps (do these once)

1. **Confirm the Supabase project** matches `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in your env.
2. **Enable Firebase as a third-party auth provider**
   Supabase Dashboard → **Authentication → Sign In / Providers → Third-Party Auth → Add Firebase**.
   Firebase project id: **`insta-dm-6a0df`**. (This makes Supabase trust Firebase ID
   tokens so RLS can read `auth.jwt() ->> 'sub'` / `'email'`.)
3. **Run the migrations** in the SQL editor in order. If `0001`–`0006` were never run,
   run them first, then **`0007_user_profiles.sql`**. (`0007` is self-contained for the
   users feature — it only needs `gen_random_uuid()`, which Supabase has by default.)
4. **Enable the flag**: add to `.env.local` (and your host's env), then rebuild:
   ```
   VITE_USERS_BACKEND=supabase
   ```

## How it behaves once on

- **Sign-in** calls the `link_firebase_identity()` RPC: it finds your row by Firebase
  UID (or links it by email for an admin-pre-created row), or inserts a new
  **Viewer / pending** row. UID, email and `email_verified` are read from the signed
  token — never from the client.
- **Owners** (`reservation.bookends@gmail.com`, `moin.bookends@gmail.com`) auto-promote
  to **Admin** — but only with a **verified** email (sign in once, verify, you're Admin).
- **User Management** reads/writes `user_profiles` under RLS: admins manage everyone;
  a non-admin can only read/update their own row and can never change their own
  role/status/approval/scope (DB trigger), and the **last active Admin can't be
  demoted/disabled** (advisory-locked, race-safe).

## Verify (after enabling)

1. Sign in with an owner email (verified) → you're Admin; your row exists in `user_profiles`.
2. Sign up a normal account → row created as Viewer + `approved=false`; you see the
   pending screen; the owner sees the pending badge and can Approve.
3. As a non-admin, attempt to `update` your own role via the API → rejected by RLS/trigger.
4. Try to demote the last admin → rejected.

## Rollback

Remove `VITE_USERS_BACKEND` (or set it to anything but `supabase`) and rebuild — the app
instantly returns to the mock users layer. The `user_profiles` table is left intact.

## Known Phase-1 limitations (tracked for later)

- **Audit log** of admin user-changes is not yet written to Supabase (mock-only today) —
  Phase 3. `role_updated_by` + `last_role_update` are stamped on the row.
- **Admin "create user"** in Supabase mode pre-creates a profile (an invite); the person
  then signs up with that email to link. The temporary-password field is inert in this
  mode — password changes always go through **Send Password Reset** (Firebase). A
  dedicated invite UI is a follow-up (§15).
- For extra hardening, enable **MFA on the owner Google accounts** and consider moving the
  owner-email list into a config table.
