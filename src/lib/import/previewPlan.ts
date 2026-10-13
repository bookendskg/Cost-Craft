// Import dry run — works out exactly what a file WOULD do, before anything is
// written. Pure functions: the caller passes the current catalogue, so the same
// code runs against the mock layer, Supabase, and unit tests.
//
// The classification mirrors the repos' own upsert rules:
//   • materials — matched by lowercased ingredient_name
//   • yields    — matched by (ingredient, prep name, effective date), the key the
//                 repos' duplicateYield/findDuplicate use
//   • recipes   — grouped by groupRecipeLines, matched by name + size_code

import { computeYield } from "../yield";
import { normalizeYieldName } from "../data/mock/yields";
import type { MaterialInput } from "../data/mock/materials";
import type { ImportYieldRow } from "../data/mock/yields";
import type { ImportRecipeLine } from "../data/mock/recipes";
import type { IngredientYield, RawMaterial, Recipe } from "../data/types";
import { groupRecipeLines, variantPricing } from "./recipeGroups";
import {
  emptyCounts,
  type ImportMode,
  type ImportPreview,
  type ImportPreviewRow,
  type ImportRowStatus,
  type ParsedRow,
} from "./importTypes";

const key = (s: string) => s.trim().toLowerCase();

function tally(rows: ImportPreviewRow[]): Record<ImportRowStatus, number> {
  const counts = emptyCounts();
  for (const r of rows) counts[r.status]++;
  return counts;
}

/** Mode rules shared by every type: "add" never touches existing, "update" never creates. */
function statusFor(mode: ImportMode, exists: boolean): { status: ImportRowStatus; message?: string } {
  if (exists) {
    return mode === "add"
      ? { status: "skip", message: "Already exists — 'Add new only' skips it" }
      : { status: "update" };
  }
  return mode === "update"
    ? { status: "skip", message: "Not found — 'Update matching' skips it" }
    : { status: "new" };
}

// ── Raw materials ────────────────────────────────────────────────────────────
export function previewMaterials(
  mode: ImportMode,
  parsed: ParsedRow<MaterialInput>[],
  existing: RawMaterial[],
): ImportPreview {
  const byName = new Map(existing.map((m) => [key(m.ingredient_name), m]));
  const seen = new Set<string>();
  const warnings: string[] = [];

  const rows = parsed.map(({ row, value }): ImportPreviewRow => {
    const k = key(value.ingredient_name);
    const match = byName.get(k);
    const values = {
      Ingredient: value.ingredient_name,
      Category: value.category,
      "Purchase Price": value.purchase_price,
      Unit: `per 1 ${value.purchase_unit}`,
    };
    if (seen.has(k)) {
      return { row, status: "error", label: value.ingredient_name, values, message: "Duplicate of an earlier row in this file" };
    }
    seen.add(k);

    const { status, message } = statusFor(mode, !!match);
    if (status === "update" && match) {
      const same =
        match.purchase_price === value.purchase_price &&
        match.purchase_unit === value.purchase_unit &&
        match.category === value.category;
      if (same) return { row, status: "unchanged", label: value.ingredient_name, values };
      return {
        row,
        status,
        label: value.ingredient_name,
        values,
        message: `Price ${match.purchase_price ?? "—"} → ${value.purchase_price ?? "—"}`,
      };
    }
    return { row, status, label: value.ingredient_name, values, message };
  });

  const noPrice = rows.filter((r) => r.status !== "error" && r.values["Purchase Price"] == null).length;
  if (noPrice) warnings.push(`${noPrice} ingredient${noPrice === 1 ? "" : "s"} have no purchase price — recipes using them can't be costed.`);

  return { rows, counts: tally(rows), warnings };
}

// ── Yields ───────────────────────────────────────────────────────────────────
export function previewYields(
  mode: ImportMode,
  parsed: ParsedRow<ImportYieldRow>[],
  materials: RawMaterial[],
  yields: IngredientYield[],
): ImportPreview {
  const matByName = new Map(materials.map((m) => [key(m.ingredient_name), m]));
  const today = new Date().toISOString().slice(0, 10);
  const rows = parsed.map(({ row, value }): ImportPreviewRow => {
    const mat = matByName.get(key(value.ingredient_name));
    const prepName = value.name?.trim() || (mat ? `${mat.ingredient_name} Yield` : "");
    const eff = value.effective_from || today;
    const derived = computeYield({
      purchaseCost: value.purchase_cost,
      purchaseQuantity: value.purchase_quantity,
      purchaseUnit: value.purchase_unit,
      wastageQty: value.wastage_quantity,
    });
    const values = {
      Ingredient: value.ingredient_name,
      "Yield Name": prepName,
      Wastage: value.wastage_quantity,
      "Yield %": derived.yieldPct,
      "Effective From": eff,
    };
    if (!mat) {
      return {
        row,
        status: "error",
        label: value.ingredient_name,
        values,
        message: `Ingredient not found — add "${value.ingredient_name}" to Raw Materials first`,
      };
    }
    if (!(derived.usableQty > 0)) {
      return { row, status: "error", label: prepName, values, message: "Wastage is at or above the raw quantity" };
    }
    const existing = yields.find(
      (y) =>
        y.ingredient_id === mat.id &&
        y.effective_from === eff &&
        normalizeYieldName(y.name) === normalizeYieldName(prepName),
    );
    const { status, message } = statusFor(mode, !!existing);
    if (status === "update" && existing && existing.yield_percentage === derived.yieldPct) {
      return { row, status: "unchanged", label: prepName, values };
    }
    return {
      row,
      status,
      label: prepName,
      values,
      message:
        status === "update" && existing
          ? `Yield ${existing.yield_percentage}% → ${derived.yieldPct}%`
          : message,
    };
  });

  const gains = rows.filter((r) => Number(r.values["Yield %"]) > 100).length;
  const warnings = gains
    ? [`${gains} record${gains === 1 ? "" : "s"} yield more than 100% (cooking weight gain) — check that's intended.`]
    : [];
  return { rows, counts: tally(rows), warnings };
}

// ── Recipes & in-house prep (one file row per ingredient) ────────────────────
export function previewRecipes(
  mode: ImportMode,
  parsed: ParsedRow<ImportRecipeLine>[],
  recipes: Recipe[],
  materials: RawMaterial[],
  isPrep: boolean,
): ImportPreview {
  const rowOf = new Map<ImportRecipeLine, number>(parsed.map((p) => [p.value, p.row]));
  const groups = groupRecipeLines(parsed.map((p) => p.value));
  const matNames = new Set(materials.map((m) => key(m.ingredient_name)));
  const label = isPrep ? "prep" : "recipe";

  const rows: ImportPreviewRow[] = [];
  const newIngredients = new Set<string>();
  // Counts are per RECIPE (a 6-line prep is one thing being created), while the
  // table lists every line with its recipe's status.
  const counts = emptyCounts();
  let recipeCount = 0;

  for (const group of groups) {
    for (const variant of group.variants) {
      recipeCount++;
      const existing = recipes.find(
        (r) => key(r.recipe_name) === key(group.name) && (r.size_code ?? null) === variant.sizeCode,
      );
      const { status, message } = statusFor(mode, !!existing);
      counts[status]++;
      const pricing = variantPricing(variant.lines);
      const sizeLabel =
        variant.sizeCode === "15_INCH" ? " (15-inch)" : variant.sizeCode === "11_INCH" ? " (11-inch)" : "";

      variant.lines.forEach((line, idx) => {
        if (!matNames.has(key(line.ingredient_name))) newIngredients.add(line.ingredient_name.trim());
        rows.push({
          row: rowOf.get(line) ?? 0,
          status,
          label: `${group.name}${sizeLabel} → ${line.ingredient_name}`,
          values: {
            [isPrep ? "Prep" : "Recipe"]: group.name + sizeLabel,
            Category: group.category,
            Ingredient: line.ingredient_name,
            Quantity: line.quantity,
            Unit: line.unit,
            ...(isPrep ? {} : { "Selling Price": pricing.selling, Packaging: pricing.packaging }),
          },
          // Say it once per recipe, on its first line.
          message: idx === 0 ? message : undefined,
        });
      });
    }
  }

  rows.sort((a, b) => a.row - b.row);

  const warnings: string[] = [];
  if (newIngredients.size) {
    const names = [...newIngredients].slice(0, 5).join(", ");
    warnings.push(
      `${newIngredients.size} ingredient${newIngredients.size === 1 ? "" : "s"} not in Raw Materials will be created WITHOUT a price: ${names}${newIngredients.size > 5 ? "…" : ""}`,
    );
  }

  return {
    rows,
    counts,
    groups: [
      { label: `${label}${recipeCount === 1 ? "" : "s"}`, count: recipeCount },
      { label: "ingredient lines", count: rows.length },
    ],
    warnings,
  };
}
