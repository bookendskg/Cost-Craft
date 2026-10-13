# Kost Kraft — Import Templates

All importing happens on one page: **Import Data** (Admin menu, Super Admins and
users granted import access). Each card has **Download template** — that file already
contains the right headers and a worked multi-row example, so these CSVs are only a
reference copy.

| File | Card on Import Data | Notes |
|------|---------------------|-------|
| `1_raw-materials.csv` | **Raw Materials** | Base ingredient list + purchase price |
| `2_yield.csv` | **Yield** | Wastage → true yield % per ingredient |
| `3_recipes_in-house-prep.csv` | **In-House Prep** | Reusable sub-recipes |
| `4_recipes_menu.csv` | **Menu Recipes** | Sellable menu items (imported under the chosen brand) |

### What happens when you upload
1. The file is read and every row is checked.
2. You see a **preview**: each row tagged New / Update / No change / Skipped / Error,
   with the values as the system read them, plus warnings (for example ingredients
   that will be created without a price).
3. **If any row has an error, nothing is imported** — download the issue list, fix the
   file and upload again. Otherwise press Import to apply, or Discard to walk away.

CSV **or** XLSX are both accepted. Headers are matched case-insensitively.
Columns marked `*` are required. Extra columns are ignored.

---

## 1. Raw Materials
Columns: **Ingredient\***, Category, Material Type, Purchase Price, Notes
- **Material Type** → sets the purchase unit automatically. Accepts:
  - `Weight` (kg/gram) — price is **per 1 KG**
  - `Liquid` (litre/ml) — price is **per 1 Litre**
  - `Count` (piece/each) — price is **per 1 Piece**
  - Blank defaults to `Weight`.
- **Purchase Price** — number only (₹). No currency symbol needed.

## 2. Yield
Columns: **Ingredient\***, Yield Name, **Purchase Cost\***, **Purchase Quantity\***,
**Purchase Unit\***, **Wastage Quantity\***, Effective From, Notes
- **Purchase Unit** — one of: `KG, Gram, Litre, ML, Piece, Dozen, Packet, Bottle, Can`
- **Yield Name** — names the preparation ("Chopped Onion"). One ingredient can hold
  several preps on the same date, as long as the names differ.
- **Wastage Quantity** — in the **base** unit (grams for KG, ml for Litre, pieces for count).
  **Negative means weight GAINED** while cooking — boiled pasta/rice absorbs water
  (1 kg rice → 1.4 kg cooked is `-400`).
- **Effective From** — `YYYY-MM-DD` (optional; defaults to today).

## 3. Recipes — In-House Prep
Columns: **Prep Name\***, Category, **Ingredient\***, **Quantity\***, Unit
- **One row per ingredient.** Repeat the same **Prep Name** on multiple rows to add
  all its ingredients (see `Tomato Sauce` in the sample — 3 rows = 1 prep).
- **Unit** — one of `KG, Gram, Litre, ML, Piece, Dozen, Packet, Bottle, Can` (default `Gram`).

## 4. Recipes — Menu
Columns: **Recipe Name\***, Category, Size, **Ingredient\***, **Quantity\***, Unit,
Selling Price, Packaging
- **One row per ingredient** — repeat Recipe Name (and Size) across rows.
- **Size** — pizzas only: `11-inch` or `15-inch`. Leave blank for everything else.
  Different sizes of the same recipe are separate variants — repeat all ingredient rows
  per size (see the two Margherita blocks in the sample).
- **Selling Price** / **Packaging** — numbers (₹); can be blank.

---

### Import modes
- **Add** — insert new records only (skips existing).
- **Update** — change existing records only.
- **Upsert** — insert new + update existing.

Ingredients referenced in recipes should already exist in **Raw Materials** (or be
imported first) so costs resolve — the preview names any that would be created
without a price. Yield rows naming an unknown ingredient are an error, not a
creation. Problem rows can be downloaded as `import_issues.xlsx` to fix and re-upload.
