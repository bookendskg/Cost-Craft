# KostKraft MCP server

Lets an AI assistant (Claude Desktop, Claude Code, Cursor, …) read and update your
KostKraft data — look up prices, add ingredients and yields, apply a batch of
changes, and undo one.

Each person runs it **signed in as themselves**. Their KostKraft role decides what
the assistant can do, and every change appears in the Activity Log under their
name, exactly as if they had clicked it in the app.

---

## Setup (once per person, ~2 minutes)

**1. Build it**

```bash
npm install
npm run mcp:build
```

**2. Point it at your KostKraft project**

Add these to your shell profile (`~/.zshrc`), using the same values as the web app's
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`:

```bash
export KOSTKRAFT_SUPABASE_URL="https://xxxx.supabase.co"
export KOSTKRAFT_SUPABASE_ANON_KEY="eyJ..."
```

The anon key is the same public key the website ships — it grants nothing on its
own. **Never use the service-role key here**: it bypasses every permission rule.

**3. Sign in**

```bash
node mcp/dist/kostkraft-mcp.mjs login
```

Your email and password are used once to obtain a session. Only the refresh token
is saved, to `~/.kostkraft/mcp-session.json`, readable by you alone. `logout`
deletes it; `whoami` shows who this machine is signed in as.

**4. Tell your AI client about it**

Claude Desktop — `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "kostkraft": {
      "command": "node",
      "args": ["/absolute/path/to/recepie-costing/mcp/dist/kostkraft-mcp.mjs", "serve"],
      "env": {
        "KOSTKRAFT_SUPABASE_URL": "https://xxxx.supabase.co",
        "KOSTKRAFT_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

Claude Code: `claude mcp add kostkraft -- node /absolute/path/.../kostkraft-mcp.mjs serve`

Restart the client and ask it "who am I in KostKraft?" to check the connection.

---

## What the assistant can do

```bash
node mcp/dist/kostkraft-mcp.mjs tools   # the catalogue, no sign-in needed
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
npm run mcp:build    # bundle the CLI
npm run mcp:verify   # connect a real MCP client in-memory and list the tools
```
