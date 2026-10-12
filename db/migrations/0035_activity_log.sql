-- 0035_activity_log.sql — Activity Log: trustworthy who-did-what trail, Super Admin only.
--
-- audit_logs has been written by ~45 mutations since 0001 but was never readable in
-- the app, had no indexes, stored only the actor's uuid (no FK since 0008, and
-- user_profiles cascade-deletes → deleting a user orphaned their whole history), and
-- allowed ANY authenticated user to insert a row attributed to anyone (0008's
-- audit_insert is `with check (true)` over a client-supplied performed_by).
--
-- This migration:
--   1. snapshots the actor (name/email/role) on every row, like export_history (0010);
--   2. stamps performed_by from auth.uid() in a trigger, so rows can't be forged;
--   3. indexes the table for the Activity Log's filters;
--   4. restricts reads to Super Admins (Reports' Export/Access History keep their own
--      admin-level policies from 0016 — untouched);
--   5. records sign-ins inside on_sign_in(), the only trustworthy place for them.
-- Idempotent / re-runnable.

begin;

-- ── 1. Actor snapshot ────────────────────────────────────────────────────────
alter table public.audit_logs add column if not exists actor_name  text;
alter table public.audit_logs add column if not exists actor_email text;
alter table public.audit_logs add column if not exists actor_role  text;

update public.audit_logs a
set actor_name  = p.name,
    actor_email = p.email,
    actor_role  = p.role
from public.user_profiles p
where p.id = a.performed_by
  and a.actor_name is null;

-- ── 2. Stamp the actor server-side (anti-forgery) ────────────────────────────
create or replace function public.stamp_audit_actor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_profile public.user_profiles;
begin
  -- Service-role / SQL-editor writes have no auth.uid(); keep what they supplied.
  if auth.uid() is not null then
    new.performed_by := auth.uid();
  end if;
  if new.performed_by is not null then
    select * into v_profile from public.user_profiles where id = new.performed_by;
    if found then
      new.actor_name  := coalesce(new.actor_name,  v_profile.name);
      new.actor_email := coalesce(new.actor_email, v_profile.email);
      new.actor_role  := coalesce(new.actor_role,  v_profile.role);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists stamp_audit_actor on public.audit_logs;
create trigger stamp_audit_actor
  before insert on public.audit_logs
  for each row execute function public.stamp_audit_actor();

-- ── 3. Indexes (the table had none — every read was a seq scan + sort) ───────
create index if not exists audit_logs_performed_at_idx on public.audit_logs (performed_at desc);
create index if not exists audit_logs_entity_idx       on public.audit_logs (entity_type, performed_at desc);
create index if not exists audit_logs_actor_idx        on public.audit_logs (performed_by, performed_at desc);

-- ── 4. Super-Admin-only reads ────────────────────────────────────────────────
-- Replaces 0016's audit_read (super_admin / admin / has_cap('audit.view')).
drop policy if exists audit_read on public.audit_logs;
create policy audit_read on public.audit_logs for select to authenticated
  using (public.is_app_super_admin());
-- Inserts stay open to authenticated users (every repo writes its own trail); the
-- trigger above decides WHO a row belongs to. No update/delete policy → append-only.

-- ── 5. Log sign-ins inside on_sign_in() ──────────────────────────────────────
-- Same body as 0019 (single owner mspatel05831@gmail.com) plus the session row.
create or replace function public.on_sign_in()
returns public.user_profiles
language plpgsql security definer set search_path = public as $$
declare
  v_email     text;
  v_confirmed boolean;
  v_owner     boolean;
  v_row       public.user_profiles;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('on_sign_in_' || auth.uid()::text));
  select email, (email_confirmed_at is not null) into v_email, v_confirmed
    from auth.users where id = auth.uid();
  v_owner := coalesce(v_confirmed,false) and lower(coalesce(v_email,'')) in
    ('mspatel05831@gmail.com');

  update public.user_profiles set
    last_login     = now(),
    email_verified = coalesce(v_confirmed,false),
    role           = case when v_owner then 'super_admin' else role end,
    approved       = case when v_owner then true else approved end
  where id = auth.uid()
  returning * into v_row;

  if not found then
    insert into public.user_profiles (id, email, name, role, approved, email_verified, last_login)
    values (
      auth.uid(), coalesce(v_email,''), split_part(coalesce(v_email,''), '@', 1),
      case when v_owner then 'super_admin' else 'viewer' end,
      v_owner, coalesce(v_confirmed,false), now()
    )
    returning * into v_row;
  end if;

  if v_row.status = 'inactive' then
    raise exception 'Your account has been disabled. Please contact an administrator.';
  end if;

  -- Activity Log: record the sign-in (never block the sign-in itself).
  begin
    insert into public.audit_logs (entity_type, entity_id, action, performed_by, notes)
    values ('session', auth.uid()::text, 'login', auth.uid(), 'Signed in');
  exception when others then null;
  end;

  return v_row;
end $$;

commit;
