# Data snapshot (backup archive)

This folder is a **JSON backup** of the application's full seeded dataset — recipes, raw
materials, ingredient prices (baked into the material records), yields, packaging, brands,
outlets, users, roles and system settings.

The live app now starts with an **empty catalog** (see `buildEmptySeed()` in
`src/lib/data/seed.ts`); this snapshot preserves the previously-seeded demo/catalog data so
nothing is lost and it can be referenced or re-imported later.

## Files

- `mockdb.full.json` — the entire dataset in one object (every table).
- One file per table: `raw_materials.json`, `recipes.json`, `recipe_ingredients.json`,
  `ingredient_yields.json`, `packaging_items.json`, `brands.json`, `outlets.json`,
  `users.json`, `roles.json`, `system_settings.json`, `recipe_versions.json`, …

## Regenerating

This is produced from the canonical `buildSeed()` (which still contains the full catalog):

```
npx vite-node scripts/export-data.ts
```

## Notes

- `users.json` contains **mock-only** passwords used by the localStorage auth layer — these
  are not real credentials and never leave the browser.
- Counts at time of export: 882 materials · 124 recipes · 1246 ingredient lines · 87 yields ·
  43 packaging items · 2 brands · 6 outlets · 6 roles · 6 users.
