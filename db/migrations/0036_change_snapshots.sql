-- 0036_change_snapshots.sql — snapshots that make a change revertible.
--
-- The Activity Log (0035) records WHO changed WHAT, but not enough to undo it:
-- recipe edits stored no values at all, deletes kept no copy of the row, and an
-- import wrote a single summary row with counts. These columns store the complete
-- record (and its child rows) on both sides of every change, so a Super Admin can
-- restore it with one click.
--
--   before_state / after_state — full entity snapshots: { type, id, row, children }
--   batch_id                   — ties every write of one import / bulk action together
--   revert_of                  — set on the row written BY a revert, pointing at the
--                                change it undid. audit_logs stays append-only (0035),
--                                so "has been reverted" is derived from this pointer
--                                rather than by updating the original row.
-- Idempotent / re-runnable.

begin;

alter table public.audit_logs add column if not exists before_state jsonb;
alter table public.audit_logs add column if not exists after_state  jsonb;
alter table public.audit_logs add column if not exists batch_id     uuid;
alter table public.audit_logs add column if not exists revert_of    uuid
  references public.audit_logs (id) on delete set null;

-- "Every change to this record, newest first" — the revert UI's main lookup, and
-- the conflict check. 0035 indexed entity_type alone, which still scanned.
create index if not exists audit_logs_entity_history_idx
  on public.audit_logs (entity_type, entity_id, performed_at desc);

-- "Revert this whole import."
create index if not exists audit_logs_batch_idx
  on public.audit_logs (batch_id)
  where batch_id is not null;

-- "Has this change already been reverted?"
create index if not exists audit_logs_revert_of_idx
  on public.audit_logs (revert_of)
  where revert_of is not null;

commit;
