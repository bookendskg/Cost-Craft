-- 0039_mcp_tokens.sql — connector tokens for the HOSTED MCP server.
--
-- The local connector keeps a session on the user's own machine. ChatGPT (and any
-- other client that can only reach a URL) can't do that, so each person issues a
-- personal token from Profile → AI Assistant and pastes it into their client. The
-- mcp-http Edge Function maps that token back to them and acts with THEIR
-- permissions — same roles, same Activity Log attribution, same revert.
--
-- Only the SHA-256 of the token is stored, so reading this table grants nothing.
-- A token is revoked by deleting the row (or stamping revoked_at); either way the
-- next request fails. Idempotent / re-runnable.

begin;

create table if not exists public.mcp_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  token_hash    text not null unique,
  name          text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id, created_at desc);

alter table public.mcp_tokens enable row level security;

-- Each person manages only their own tokens; the Edge Function reads with the
-- service role, so it never needs a policy here.
drop policy if exists mcp_tokens_insert on public.mcp_tokens;
create policy mcp_tokens_insert on public.mcp_tokens for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists mcp_tokens_read on public.mcp_tokens;
create policy mcp_tokens_read on public.mcp_tokens for select to authenticated
  using (user_id = auth.uid());

drop policy if exists mcp_tokens_delete on public.mcp_tokens;
create policy mcp_tokens_delete on public.mcp_tokens for delete to authenticated
  using (user_id = auth.uid());

commit;
