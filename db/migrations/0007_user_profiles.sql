-- 0007_user_profiles.sql — Firebase-auth user profiles (Phase 1 of the Supabase backend).
--
-- The app authenticates with FIREBASE. To enforce per-user access in Postgres we use
-- Supabase "third-party auth": the client attaches the Firebase ID token, so inside
-- RLS `auth.jwt() ->> 'sub'` is the Firebase UID and `auth.jwt() ->> 'email'` is the
-- verified email.
--
-- PREREQUISITES (Supabase dashboard, once):
--   1. Authentication → Sign In / Providers → Third-Party Auth → add Firebase,
--      project id = insta-dm-6a0df.
--   2. Run 0001..0006 first if not already applied, then run this file in the SQL editor.
--   3. (Owners only) they become Admin automatically via the link RPC below.
--
-- This supersedes the legacy public.profiles (0002, keyed on Supabase auth.users) for
-- the Firebase-first flow. We DO NOT drop public.profiles; it is simply unused here.

-- Roles + status match the current app enums (admin / rnd / outlet_manager / staff / viewer).
do $$ begin
  create type app_role as enum ('admin','rnd','outlet_manager','staff','viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type app_account_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

create table if not exists public.user_profiles (
  id                uuid primary key default gen_random_uuid(),
  firebase_uid      text unique,                 -- set on first sign-in via the link RPC
  email             text not null,
  name              text not null default '',
  role              app_role not null default 'viewer',
  status            app_account_status not null default 'active',
  approved          boolean not null default false,   -- self sign-ups start unapproved
  email_verified    boolean not null default false,
  phone             text,
  avatar_url        text,
  assigned_brand    text check (assigned_brand in ('capiche','aiko')),
  assigned_outlet   text,                         -- outlet id (e.g. 'capiche-piplod')
  accessible_brands text[],                       -- viewer scope; null = all brands
  show_cost         boolean,
  dashboard_access  boolean not null default false,
  theme_pref        text,
  last_login        timestamptz,
  last_role_update  timestamptz,
  role_updated_by   text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists user_profiles_email_lower_idx
  on public.user_profiles (lower(email));

alter table public.user_profiles enable row level security;

-- ── Helper functions (SECURITY DEFINER so policies never recurse on the table) ──

-- Firebase UID from the third-party JWT.
create or replace function public.fb_uid()
returns text language sql stable as $$
  select auth.jwt() ->> 'sub'
$$;

-- Is the caller an active Admin?
create or replace function public.is_app_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.user_profiles
    where firebase_uid = public.fb_uid() and role = 'admin' and status = 'active'
  )
$$;

-- ── Row Level Security ──
-- Read: your own row, or everything if you're an Admin.
create policy "user_profiles_select" on public.user_profiles
  for select to authenticated
  using (firebase_uid = public.fb_uid() or public.is_app_admin());

-- Insert: Admins only (admin-created users). Self sign-ups are created by the
-- SECURITY DEFINER link RPC below, never by a direct client insert.
create policy "user_profiles_insert_admin" on public.user_profiles
  for insert to authenticated
  with check (public.is_app_admin());

-- Update: Admins update anyone; a user may update only their own row (a trigger
-- below blocks them from changing role/status/approval/scope).
create policy "user_profiles_update_admin" on public.user_profiles
  for update to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

create policy "user_profiles_update_own" on public.user_profiles
  for update to authenticated
  using (firebase_uid = public.fb_uid()) with check (firebase_uid = public.fb_uid());

-- No client may delete profiles (default-deny made explicit so a future policy
-- can't accidentally open it). Deactivate via status='inactive' instead.
create policy "user_profiles_no_delete" on public.user_profiles
  for delete to authenticated using (false);

-- ── Guard triggers (§28 privilege escalation) ──

-- A non-admin cannot escalate their own role/status/approval/scope.
create or replace function public.prevent_profile_self_escalation()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.firebase_uid = public.fb_uid() and not public.is_app_admin()
     and ( new.role <> old.role
        or new.status <> old.status
        or coalesce(new.approved,false)         <> coalesce(old.approved,false)
        or coalesce(new.assigned_brand,'')       <> coalesce(old.assigned_brand,'')
        or coalesce(new.assigned_outlet,'')      <> coalesce(old.assigned_outlet,'')
        or coalesce(new.dashboard_access,false)  <> coalesce(old.dashboard_access,false) ) then
    raise exception 'cannot change your own role/status/approval/scope';
  end if;
  return new;
end $$;

create trigger trg_user_profiles_no_self_escalation
  before update on public.user_profiles
  for each row execute function public.prevent_profile_self_escalation();

-- Never demote or disable the last remaining active Admin.
create or replace function public.prevent_last_admin_removal()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if old.role = 'admin' and old.status = 'active'
     and (new.role <> 'admin' or new.status <> 'active') then
    -- Serialize concurrent demotions so two admins can't both pass the count
    -- check and leave zero admins (race condition). Lock is released at commit.
    perform pg_advisory_xact_lock(hashtext('user_profiles_last_admin'));
    if (select count(*) from public.user_profiles where role = 'admin' and status = 'active') <= 1 then
      raise exception 'cannot remove the last remaining Admin';
    end if;
  end if;
  return new;
end $$;

create trigger trg_user_profiles_last_admin
  before update on public.user_profiles
  for each row execute function public.prevent_last_admin_removal();

-- Keep updated_at fresh + stamp role-change history.
create or replace function public.user_profiles_touch()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  if new.role is distinct from old.role then
    new.last_role_update = now();
  end if;
  return new;
end $$;

create trigger trg_user_profiles_touch
  before update on public.user_profiles
  for each row execute function public.user_profiles_touch();

-- ── Sign-in linking RPC ──
-- Called by the client on every Firebase sign-in. Runs as SECURITY DEFINER so it can
-- link a pre-created (admin-invited) row to the new Firebase identity, but it ONLY
-- ever acts on the CALLER's own token (uid + email come from auth.jwt(), never the
-- client), so it cannot be used to impersonate or self-elevate another account.
-- Owners (by VERIFIED token email) are auto-promoted to Admin. Identity, email and
-- the email_verified flag are all read from the signed token — never from client
-- params — so they cannot be spoofed. p_email_verified is only a fallback if the
-- Firebase token omits the claim (it normally includes it).
create or replace function public.link_firebase_identity(
  p_name text default null,
  p_email_verified boolean default false
)
returns public.user_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_uid      text    := public.fb_uid();
  v_email    text    := auth.jwt() ->> 'email';
  v_verified boolean := coalesce((auth.jwt() ->> 'email_verified')::boolean, p_email_verified, false);
  v_owner    boolean;
  v_row      public.user_profiles;
  v_found    boolean := false;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- Owner promotion requires a verified email, so a freshly-created (unverified)
  -- account that merely uses an owner address cannot auto-escalate.
  v_owner := v_verified and lower(coalesce(v_email,'')) in
    ('reservation.bookends@gmail.com','moin.bookends@gmail.com');

  select * into v_row from public.user_profiles where firebase_uid = v_uid;
  v_found := found;
  if not v_found and v_email is not null then
    select * into v_row from public.user_profiles where lower(email) = lower(v_email);
    v_found := found;
  end if;

  if v_found then
    if v_row.status = 'inactive' then
      raise exception 'Your account has been disabled. Please contact an administrator.';
    end if;
    update public.user_profiles set
      firebase_uid   = v_uid,
      last_login     = now(),
      email_verified = v_verified,
      role           = case when v_owner then 'admin'::app_role else role end,
      approved       = case when v_owner then true else approved end
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.user_profiles (firebase_uid, email, name, role, approved, email_verified, last_login)
    values (
      v_uid,
      coalesce(v_email, ''),
      coalesce(p_name, split_part(coalesce(v_email,''), '@', 1)),
      case when v_owner then 'admin'::app_role else 'viewer'::app_role end,
      v_owner,
      v_verified,
      now()
    )
    returning * into v_row;
  end if;
  return v_row;
end $$;

grant execute on function public.link_firebase_identity(text, boolean) to authenticated;

-- ── One-time bootstrap (optional) ──
-- Owners auto-promote via the RPC above. To promote any other account by email:
-- update public.user_profiles set role='admin', approved=true, status='active'
--   where lower(email) = 'someone@example.com';
