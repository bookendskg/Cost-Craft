-- 0011_recipe_access_links.sql
-- §11–§19 Temporary, read-only recipe share links. Only the SHA-256 hash of the token
-- is stored (never the raw token). Expiry (30 min) + revocation must be enforced when
-- the token is resolved. Mirrors src/lib/data/types.ts (RecipeAccessLink) +
-- src/lib/data/mock/accessLinks.ts.
--
-- Public resolution (an unauthenticated visitor opening /share/:token) must go through
-- a SECURITY DEFINER function / edge function that: looks the row up by token_hash,
-- rejects expired/revoked links, strips all financial columns, increments access_count,
-- and returns only the recipe payload. Direct table SELECT stays admin-only via RLS.

create table if not exists public.recipe_access_links (
  id                   uuid primary key,
  token_hash           text not null unique,
  recipe_id            uuid not null references recipes(id) on delete cascade,
  granted_by_user_id   uuid references users(id) on delete set null,
  granted_by_name      text not null,
  granted_by_role      text not null check (granted_by_role in ('admin','editor','head_chef','chef','viewer')),
  granted_to_user_id   uuid references users(id) on delete set null,
  granted_to_email     text,
  granted_to_role      text check (granted_to_role in ('admin','editor','head_chef','chef','viewer')),
  granted_to_brand_id  text check (granted_to_brand_id in ('capiche','aiko')),
  granted_to_outlet_id text,
  access_type          text not null check (access_type in ('READ_ONLY','DOWNLOAD_PDF','VIEW_AND_DOWNLOAD')),
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null,
  revoked_at           timestamptz,
  revoked_by_user_id   uuid references users(id) on delete set null,
  last_accessed_at     timestamptz,
  access_count         integer not null default 0,
  status               text not null default 'ACTIVE' check (status in ('ACTIVE','EXPIRED','REVOKED'))
);

create index if not exists access_links_token_idx  on public.recipe_access_links (token_hash);
create index if not exists access_links_recipe_idx on public.recipe_access_links (recipe_id);

alter table public.recipe_access_links enable row level security;
-- Direct reads are admin-only (public visitors go through the resolver function, not SELECT).
drop policy if exists "access_links_admin_read" on public.recipe_access_links;
create policy "access_links_admin_read" on public.recipe_access_links
  for select using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists "access_links_grantor_manage" on public.recipe_access_links;
create policy "access_links_grantor_manage" on public.recipe_access_links
  for all using (auth.uid() = granted_by_user_id) with check (auth.uid() = granted_by_user_id);
