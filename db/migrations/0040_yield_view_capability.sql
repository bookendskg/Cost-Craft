-- 0040_yield_view_capability.sql — seed the new yield.view capability.
--
-- "View yields" was split out of "Manage yields" so a role can be given read-only
-- access to Yield Management (same shape as packaging.view / packaging.manage).
-- role_capabilities was seeded before that split, so it holds no yield.view rows;
-- can() prefers live rows over the built-in matrix, which would hide the page.
-- (can() also treats yield.manage as implying yield.view, so access never depends
-- on this file having run — these rows just make the Roles matrix show the truth.)
-- Mirrors the built-in matrix: every role that manages yields can view them.
-- Idempotent.

insert into public.role_capabilities (role_key, capability)
select r, 'yield.view'
from (values ('super_admin'), ('admin'), ('editor'), ('head_chef')) as t(r)
on conflict do nothing;
