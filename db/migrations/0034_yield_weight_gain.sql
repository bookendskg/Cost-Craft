-- 0034_yield_weight_gain.sql — cooking weight gain (yield > 100%) + per-prep yield records.
--
-- (a) Boiling ADDS weight: 1 kg Arborio rice → 1.4 kg cooked, i.e. wastage −400 g and
--     140% yield. 0005 pinned wastage_quantity >= 0, so those rows could never save.
--     The lower bound now allows a gain of up to 9× the raw quantity, which keeps
--     yield_percentage inside its decimal(5,2) column (< 1000%).
-- (b) A yield record is one PREPARATION of an ingredient ("Chopped Green Garlic" 74.07%
--     vs "Processed Green Garlic" 46.15%), so the old unique (ingredient_id,
--     effective_from) forced different preps onto different dates. The key now includes
--     the prep name, compared case/space-insensitively. Blank names are backfilled to
--     "<Ingredient> Yield" first (the app also requires a name from now on).
-- Idempotent.

begin;

-- ── (a) allow negative wastage ───────────────────────────────────────────────
alter table public.ingredient_yields
  drop constraint if exists ingredient_yields_wastage_quantity_check;
alter table public.ingredient_yields
  drop constraint if exists wastage_within_bounds;
alter table public.ingredient_yields
  add constraint wastage_within_bounds
  check (wastage_quantity > -9 * raw_quantity);
-- wastage_below_raw (wastage_quantity < raw_quantity) and the usable_quantity > 0
-- check from 0005 still apply and stay unchanged.

-- ── (b) uniqueness per prep ──────────────────────────────────────────────────
update public.ingredient_yields y
set name = rm.ingredient_name || ' Yield'
from public.raw_materials rm
where rm.id = y.ingredient_id
  and (y.name is null or btrim(y.name) = '');

alter table public.ingredient_yields
  drop constraint if exists ingredient_yields_ingredient_id_effective_from_key;

create unique index if not exists ingredient_yields_ingredient_name_date_key
  on public.ingredient_yields (ingredient_id, lower(btrim(name)), effective_from);

commit;
