-- 0033_packaging_capabilities.sql — seed the packaging capabilities for the built-in roles.
--
-- packaging.view / packaging.manage were added to the app's capability matrix
-- (src/lib/auth/permissions.ts) AFTER role_capabilities was seeded in 0016, so the
-- table has no packaging rows. can() prefers the live rows over the built-in matrix,
-- which hid "Add Packaging" from Admin / Editor (Super Admin bypasses the check).
-- Mirrors the built-in matrix: admin + editor manage, head_chef views. Idempotent.

insert into public.role_capabilities (role_key, capability)
select 'super_admin', c from (values ('packaging.view'), ('packaging.manage')) as t(c)
on conflict do nothing;

insert into public.role_capabilities (role_key, capability)
select 'admin', c from (values ('packaging.view'), ('packaging.manage')) as t(c)
on conflict do nothing;

insert into public.role_capabilities (role_key, capability)
select 'editor', c from (values ('packaging.view'), ('packaging.manage')) as t(c)
on conflict do nothing;

insert into public.role_capabilities (role_key, capability)
select 'head_chef', c from (values ('packaging.view')) as t(c)
on conflict do nothing;
