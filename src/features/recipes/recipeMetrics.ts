import { round2 } from "@/lib/costing";
import type { Recipe } from "@/lib/data/types";

/** Per-portion packaging cost (box/container). */
export function packagingOf(recipe: Recipe): number {
  return recipe.packaging_cost ?? 0;
}

/** Full per-portion cost the menu price must cover = food cost + packaging. */
export function fullCostPerPortion(recipe: Recipe): number {
  return round2((recipe.cost_per_portion ?? 0) + packagingOf(recipe));
}

/** Menu price = chef-set selling price, or the suggested price as a fallback. */
export function menuPriceOf(recipe: Recipe, foodCostPct: number): number {
  if (recipe.selling_price && recipe.selling_price > 0) return recipe.selling_price;
  const cpp = fullCostPerPortion(recipe);
  return foodCostPct > 0 ? round2(cpp / (foodCostPct / 100)) : 0;
}

/** Actual food cost % = full per-portion cost ÷ menu price. */
export function foodCostPctOf(recipe: Recipe, foodCostPct: number): number {
  const menu = menuPriceOf(recipe, foodCostPct);
  const cpp = fullCostPerPortion(recipe);
  return menu > 0 ? round2((cpp / menu) * 100) : 0;
}

export function profitMarginOf(recipe: Recipe, foodCostPct: number): number {
  return round2(menuPriceOf(recipe, foodCostPct) - fullCostPerPortion(recipe));
}

export type FcTone = "good" | "warn" | "bad";

/** Tone for the FC% badge/bar relative to the critical threshold (e.g. 35%). */
export function fcTone(fcPct: number, criticalPct: number): FcTone {
  if (fcPct >= criticalPct) return "bad";
  if (fcPct >= criticalPct - 5) return "warn";
  return "good";
}

export const FC_TONE_STYLES: Record<FcTone, { badge: string; bar: string }> = {
  good: { badge: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  warn: { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-500" },
  bad: { badge: "bg-red-100 text-red-700", bar: "bg-red-500" },
};

/** Stable display SKU derived from the recipe id (REC-###). */
export function skuOf(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `REC-${(hash % 900) + 100}`;
}
