-- 0038_mcp_pairing.sql — one-time codes that connect an AI assistant to KostKraft.
--
-- The flow: signed in on the website, a user generates a short-lived code and pastes
-- it (with the setup instructions) into their AI assistant. The assistant runs the
-- connector, which redeems the code through the mcp-pair Edge Function and receives
-- a session for THAT user. No password is ever typed into a terminal or shown to the
-- assistant, and the code dies after one use or ten minutes.
--
-- Only the SHA-256 of the code is stored, so a leaked table row can't be redeemed.
-- Idempotent / re-runnable.

begin;

create table if not exists public.mcp_pairing_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  code_hash   text not null unique,
  label       text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_ip     text
);

create index if not exists mcp_pairing_codes_user_idx on public.mcp_pairing_codes (user_id, created_at desc);

alter table public.mcp_pairing_codes enable row level security;

-- A user may create and see their OWN codes (to list/revoke them); nobody can read
-- anyone else's. The Edge Function redeems with the service role, bypassing this.
drop policy if exists mcp_codes_insert on public.mcp_pairing_codes;
create policy mcp_codes_insert on public.mcp_pairing_codes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists mcp_codes_read on public.mcp_pairing_codes;
create policy mcp_codes_read on public.mcp_pairing_codes for select to authenticated
  using (user_id = auth.uid());

-- Revoking = deleting your own unused code.
drop policy if exists mcp_codes_delete on public.mcp_pairing_codes;
create policy mcp_codes_delete on public.mcp_pairing_codes for delete to authenticated
  using (user_id = auth.uid());

commit;
