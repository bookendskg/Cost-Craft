# Supabase Backend — Phase 1: Auth + User Profiles + RLS

Phase 1 makes **Supabase the authentication provider** and moves the **users/roles**
store to a real Supabase table (`public.user_profiles`) with Row Level Security.
Firebase has been removed. Every other module (recipes, materials, yields, wastage,
audit) still runs on the mock layer for now — Phases 2–3.

It activates automatically when Supabase is configured. With **no** Supabase env vars
the app falls back to the local mock layer (seed users), so local dev still works.

---

## What ships in the code

| File | Role |
|---|---|
| `db/migrations/0007_user_profiles.sql` | `user_profiles` table (keyed on `auth.users.id`), RLS, guard triggers, `handle_new_user` + `on_sign_in()` |
| `src/lib/supabase/client.ts` | Supabase client (its own auth session carries the JWT for RLS) |
| `src/lib/supabase/profile.ts` | `hydrateUserFromProfile`, `onSignIn`, `sendPasswordReset`, `updateOwnProfile`, `syncThemePref` |
| `src/lib/data/supabase/users.ts` | `supabaseUsersRepo` (list/getById/update) behind the mock repo interface |
| `src/lib/auth/session.ts`, `initAuth.ts` | Supabase sign-in/hydration (Firebase removed) |

## Console steps (do these once)

1. **Confirm the Supabase project** matches `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in your env (`.env.local` locally, Render dashboard for deploy).
2. **Authentication → Providers → Email = ON.** Decide on **Confirm email**:
   - **Off** → signup logs the user straight in (lands on the pending-approval screen).
   - **On** (recommended) → user must click the confirmation link before signing in.
   - Keep **"Secure email change" ON** (Supabase default): owner auto-promotion only
     fires for a *confirmed* email, and secure email change prevents an account from
     confirming (and thus claiming) an owner address it doesn't actually control.
3. **SQL Editor → run `db/migrations/0007_user_profiles.sql`.** (Self-contained for the
   users feature — only needs the `auth` schema + `gen_random_uuid()`, both built in.)
4. Rebuild/redeploy so Vite picks up the env vars. That's it — no flag needed; the app
   uses Supabase whenever those two env vars are present.

## How it behaves

- **Sign-up** → Supabase creates the auth user; a DB trigger creates the profile
  (**Viewer, pending**). The app calls `on_sign_in()` which stamps `last_login`, mirrors
  email-verification from `auth.users`, and promotes **verified owner emails** to Admin.
- **Owners** (`reservation.bookends@gmail.com`, `moin.bookends@gmail.com`) become Admin
  automatically once their email is **confirmed**.
- **User Management** reads/writes `user_profiles` under RLS — admins manage everyone; a
  non-admin can only read/update their own row and can never change their own
  role/status/approval/scope (trigger); the **last active Admin can't be removed**
  (advisory-locked).
- **Passwords** are owned by Supabase Auth — admins use **Send Password Reset**; the
  user can use **Forgot Password**.

## Verify

1. Sign up with an owner email; confirm the email; sign in → you're **Admin**, and a row
   exists in `user_profiles`.
2. Sign up a normal account → Viewer + `approved=false` → pending screen; the owner sees
   the pending badge and can **Verify & Approve**.
3. As a non-admin, hit the profile-update API with a role change → rejected by RLS/trigger.
4. Try to demote the last admin → rejected.

## Rollback

Remove the Supabase env vars and rebuild → the app returns to the mock users layer. The
`user_profiles` table is left intact for a retry.

## Known Phase-1 limitations (tracked for later)

- **Admin "Create User"** can't mint an auth account for someone else from the browser
  (needs a server-side invite). In Supabase mode the create action returns a clear
  message — users self-register and an admin approves + assigns their role. A proper
  invite flow is a follow-up (§15).
- **Audit log** of admin user-changes is mock-only today (Phase 3); `role_updated_by` +
  `last_role_update` are stamped on the row.
- Consider enabling **MFA** on the owner accounts.
