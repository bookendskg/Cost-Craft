# KostKraft MCP server

Lets an AI assistant (Claude Desktop, Claude Code, Cursor, …) read and update your
KostKraft data — look up prices, add ingredients and yields, apply a batch of
changes, and undo one.

Each person runs it **signed in as themselves**. Their KostKraft role decides what
the assistant can do, and every change appears in the Activity Log under their
name, exactly as if they had clicked it in the app.

---

## Setup — what a user actually does

They never clone this repo. On the deployed site:

1. Sign in → **Profile → AI Assistant** → **Generate setup code**.
2. Copy the block shown and paste it into Claude (or any assistant that can run
   commands).
3. The assistant downloads `https://<your-site>/mcp/kostkraft-mcp.mjs`, runs
   `pair <CODE>`, adds the MCP config and reconnects. Asking "who am I in KostKraft?"
   confirms it.

The code is single-use, expires in 15 minutes, and only its SHA-256 is stored
(`db/migrations/0038_mcp_pairing.sql`). It is redeemed by the **mcp-pair** Edge
Function, which hands back a one-time sign-in token for that user — so no password
is ever typed into a terminal or seen by the assistant.

### What a Super Admin sets up once

```bash
# 1. the pairing table
#    run db/migrations/0038_mcp_pairing.sql in the Supabase SQL editor
# 2. the redeemer (no JWT: the connector has no session yet — the code IS the credential)
supabase functions deploy mcp-pair --no-verify-jwt
```

The connector itself ships with the site: `npm run build` bundles it to
`public/mcp/kostkraft-mcp.mjs` with the project URL and anon key baked in, so a
downloaded file already knows which KostKraft it belongs to.

### Terminal alternative

`node ~/.kostkraft/kostkraft-mcp.mjs login` signs in with email + password instead
of a pairing code. Handy for debugging; the pairing flow is what users get.

## What the assistant can do

```bash
node ~/.kostkraft/kostkraft-mcp.mjs tools   # the catalogue, no sign-in needed
```

**Reading** — `whoami`, `list_ingredients`, `get_ingredient`, `list_recipes`,
`get_recipe`, `list_yields`, `list_packaging`, `list_activity`.

**Writing** — `update_ingredient_price`, `create_ingredient`, `create_yield`,
`apply_ingredient_import`, `apply_yield_import`, `revert_change`.

**Bulk changes are two steps.** `preview_ingredient_import` / `preview_yield_import`
show exactly what would happen — new, updated, unchanged, rejected — and write
nothing. The matching `apply_…` tool refuses unless `confirm: true` is passed, so an
assistant can't quietly rewrite hundreds of rows from a vague instruction.

Example conversation:

> "Onion is now ₹120 a kilo, and chopped onion yields 66%."

The assistant calls `update_ingredient_price`, then `create_yield`. Every recipe
using onion is re-costed, price history records the move, and the Activity Log shows
both changes under your name.

---

## Why it's safe

- **No privileged key.** It signs in as a person. Supabase row-level security and
  your KostKraft role apply unchanged — an Editor can edit prices, a Head Chef can't,
  a Viewer can only read. Deactivate someone in User Management and their assistant
  stops working too.
- **Changes go through the app's own code**, not raw SQL. Unit conversion, the recipe
  cost cascade, price history, the audit entry and the revert snapshot all still happen.
- **Everything is traceable and reversible.** A Super Admin sees each change in the
  Activity Log and can revert it — or a whole import batch — in one click.
- **Only Super Admins see or undo history.** `list_activity` and `revert_change`
  return nothing for anyone else, enforced by the database, not by this code.

Worth knowing: an assistant can make mistakes a person wouldn't. Reverting is
per-change or per-batch, so it's wise to let it work in small, previewed steps.

---

## How it's built

`mcp/src/server.ts` imports the app's repositories (`src/lib/data/*`) directly. The
bundle aliases `@/lib/supabase/client` to `mcp/src/supabaseClient.ts`, a Node version
of the browser client that uses the stored session — so there is one copy of the
business rules, shared by the website and the assistant.

```bash
npm run mcp:build    # bundle to public/mcp/kostkraft-mcp.mjs (runs as part of npm run build)
npm run mcp:verify   # typecheck, then connect a real MCP client in-memory and list the tools
```

Commands: `pair <CODE>` · `login` · `whoami` · `config` · `tools` · `logout` · `serve`.
