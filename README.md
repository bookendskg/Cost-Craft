# Recipe Costing & Food Cost Management System

A web app that automates recipe costing for multi-brand restaurant R&D — replacing manual Google-Sheets costing with real-time cost calculation, an approval workflow, role-based access, and PDF/Excel exports. Built to the PRD v1.0 spec.

## Status

Full **v1.0** scope (all 8 modules / 10 PRD phases) is implemented against a **mock data layer** (in-memory, persisted to `localStorage`). Every feature is wired through a typed repository interface so the backend can later be swapped for Supabase with no changes to UI, costing, validation, or permission code.

## Tech stack

React 18 · TypeScript · Vite · Tailwind · ShadCN-style UI (Radix) · TanStack Query · React Hook Form · Zod · Zustand · React Router v6 · Recharts · pdfmake · SheetJS.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Demo accounts (password: `password123`)

| Role   | Email             | Lands on                          |
|--------|-------------------|-----------------------------------|
| Admin  | rahul@brand.com   | Full access + approvals + audit   |
| Editor | priya@brand.com   | Recipes + raw materials + reports |
| Viewer | amit@brand.com    | Assigned approved recipes only    |

The login screen has one-click buttons to fill each demo account. Use **Settings → Reset Demo Data** to restore the seed.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check + production build |
| `npm run test` | Unit + integration tests (Vitest) |
| `npm run test:e2e` | Playwright E2E (run `npx playwright install` once first) |
| `npm run lint` | ESLint |

## Architecture

```
src/
  lib/
    costing.ts          # PRD §10 costing formulae (pure, unit-tested)
    units.ts            # PRD §4.2 unit conversion engine
    auth/permissions.ts # PRD §7.2 / §14.2 role + view-mode matrix
    data/
      types.ts          # entity types mirroring PRD §9 schema
      mock/             # localStorage repos + price cascade + audit
      seed.ts           # seed data (reproduces PRD §4.4 worked example)
      index.ts          # active repo set (swap point for Supabase)
    validation/         # Zod schemas (PRD §12 messages)
  features/             # auth, raw-materials, recipes, costing, approvals,
                        # viewers, users, dashboard, reports, audit, settings
  components/ui/        # ShadCN-style primitives
db/migrations/          # SQL schema + RLS (PRD §9) — the contract the mock mirrors
```

### Key correctness anchors (tested)

- The seeded **Chicken Alfredo** recipe reproduces PRD §4.4: total ₹199.50, cost/portion ₹49.88, suggested ₹166.25 at 30% food cost.
- The **price cascade** (PRD §4.5): raising an ingredient price recalculates every recipe that uses it and records cost history — covered by `src/lib/data/cascade.test.ts`.

## Authentication (Supabase)

Real Supabase Auth is **scaffolded and env-gated**. With no env vars set, the app runs
on the mock auth layer (demo accounts above). Provide both `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` (see `.env.example`) and the app switches to real login, logout,
forgot/reset password (email), email verification, and persisted sessions — with **no UI
changes** (the `profileToUser` mapper in `src/lib/supabase/types.ts` keeps the permission
layer and every `useSession` reader unchanged).

### Hand-off checklist (to go live with auth)

1. Create a Supabase project; copy the **Project URL** and **anon public key**.
2. `cp .env.example .env.local` and fill both `VITE_SUPABASE_*` values (also set them in your
   host/CI env for deploys). `.env.local` is gitignored.
3. In the Supabase SQL editor, run `db/migrations/0001_init.sql` (if not already) then
   `db/migrations/0002_auth_profiles.sql` — this creates the `profiles` table, RLS policies,
   and the on-signup trigger.
4. **Bootstrap the first admin:** sign up one account in the app, then run
   `update public.profiles set role='admin' where email='you@example.com';`
   (the trigger defaults new users to `viewer`).
5. Auth → **URL Configuration**: set the Site URL and add a Redirect URL for
   `<origin>/reset-password` (both `http://localhost:5173/reset-password` for dev and your prod URL).
6. Auth → **Providers → Email**: for instant self-service signup, turn **off "Confirm email"**
   (otherwise every signup tries to send a confirmation email, and the built-in mailer is
   rate-limited / often returns a 500 — configure custom SMTP if you want to keep confirmation on).
   Optionally customize the reset-password / confirmation templates.

Key files: `src/lib/supabase/{client,types,profile}.ts`, `src/lib/auth/{session,initAuth}.ts`,
`src/features/auth/{ForgotPassword,ResetPassword}Page.tsx`.

## Swapping in the rest of the data layer (future)

Auth + profiles run on Supabase; the rest of the app data (materials, recipes, etc.) still
lives behind the mock at `src/lib/data/index.ts`. To migrate it too:

1. Add `src/lib/data/supabase/*` repos implementing the same exports as the mock repos.
2. Flip the export in `src/lib/data/index.ts` behind the same env flag.

UI, costing, validation, and the permission layer remain untouched — the client-side permission
checks map 1:1 to the Postgres RLS policies.
