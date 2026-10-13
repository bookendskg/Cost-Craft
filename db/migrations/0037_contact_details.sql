-- 0037_contact_details.sql — Super Admin-managed public contact details.
--
-- The public /contact page (and the Contact section of /terms) now reads its
-- email / phone / address / hours from system_settings key 'contact_details'
-- (a JSON string), edited in Profile Settings → Contact Page by the Super Admin.
--
-- This migration:
--   1. lets anonymous visitors read THAT ROW ONLY (0008's settings_read is
--      authenticated-only, so logged-out visitors would otherwise get nothing);
--   2. makes 'contact_details' Super Admin-only to write. Every other key keeps
--      0016's rule (super_admin / admin / settings.manage).
-- Idempotent / re-runnable.

begin;

-- ── 1. Public read of the contact-details row ───────────────────────────────
drop policy if exists settings_read_contact_anon on public.system_settings;
create policy settings_read_contact_anon on public.system_settings
  for select to anon
  using (key = 'contact_details');

-- ── 2. Super Admin-only writes for contact_details ─────────────────────────
drop policy if exists settings_write on public.system_settings;
create policy settings_write on public.system_settings for all to authenticated
  using (
    (public.app_role() in ('super_admin','admin') or public.has_cap('settings.manage'))
    and (key <> 'contact_details' or public.is_app_super_admin())
  )
  with check (
    (public.app_role() in ('super_admin','admin') or public.has_cap('settings.manage'))
    and (key <> 'contact_details' or public.is_app_super_admin())
  );

commit;
