// Unit conversion engine — PRD §4.2 (Unit Conversion Matrix) & §10.1.
// Pure, backend-agnostic. Never changes when Supabase is added.

export const WEIGHT_UNITS = ["KG", "Gram"] as const;
export const VOLUME_UNITS = ["Litre", "ML"] as const;
// Dozen is a count unit that converts to Piece (×12). Packet/Bottle/Can only
// convert to themselves.
export const COUNT_UNITS = ["Piece", "Dozen", "Packet", "Bottle", "Can"] as const;

export const PURCHASE_UNITS = [
  "KG",
  "Gram",
  "Litre",
  "ML",
  "Piece",
  "Dozen",
  "Packet",
  "Bottle",
  "Can",
] as const;

export const BASE_UNITS = [
  "Gram",
  "ML",
  "Piece",
  "Packet",
  "Bottle",
  "Can",
] as const;

/** Units that count in dozens convert to/from a single Piece. */
const DOZEN_UNITS = new Set(["Piece", "Dozen"]);

export type Unit = (typeof PURCHASE_UNITS)[number];

type UnitFamily = "weight" | "volume" | "count";

export function getUnitFamily(unit: string): UnitFamily | null {
  if ((WEIGHT_UNITS as readonly string[]).includes(unit)) return "weight";
  if ((VOLUME_UNITS as readonly string[]).includes(unit)) return "volume";
  if ((COUNT_UNITS as readonly string[]).includes(unit)) return "count";
  return null;
}

/**
 * Returns true if a quantity in `from` can be converted into `to`.
 * Weight units interchange; volume units interchange; count units only
 * convert to themselves (Piece→Piece, etc.) — never across families.
 */
export function canConvert(from: string, to: string): boolean {
  const f = getUnitFamily(from);
  const t = getUnitFamily(to);
  if (!f || !t) return false;
  if (f !== t) return false;
  // Count units only convert to themselves, except Piece <-> Dozen.
  if (f === "count") return from === to || (DOZEN_UNITS.has(from) && DOZEN_UNITS.has(to));
  return true;
}

/**
 * Units a recipe line may use given the ingredient's base unit. Weight base
 * accepts KG/Gram; volume base accepts Litre/ML; count base accepts only itself.
 */
export function compatibleUnits(baseUnit: string): string[] {
  const family = getUnitFamily(baseUnit);
  if (family === "weight") return ["Gram", "KG"];
  if (family === "volume") return ["ML", "Litre"];
  // A Piece-based ingredient may be measured in Piece or Dozen.
  if (baseUnit === "Piece") return ["Piece", "Dozen"];
  return [baseUnit];
}

/**
 * Conversion factor to multiply a quantity in `from` to express it in `to`.
 * PRD §4.2: KG→Gram ×1000, Litre→ML ×1000, same→same ×1, etc.
 * Throws on an invalid/incompatible pair.
 */
export function getConversionFactor(from: string, to: string): number {
  if (from === to) return 1;
  if (from === "KG" && to === "Gram") return 1000;
  if (from === "Gram" && to === "KG") return 1 / 1000;
  if (from === "Litre" && to === "ML") return 1000;
  if (from === "ML" && to === "Litre") return 1 / 1000;
  if (from === "Dozen" && to === "Piece") return 12;
  if (from === "Piece" && to === "Dozen") return 1 / 12;
  throw new Error(`Invalid unit conversion: ${from} → ${to}`);
}

// --- Simplified raw-material purchase model -----------------------------------
// A raw material's price is entered per ONE automatic purchase unit, chosen by
// its measurement type: Weight → 1 kg, Liquid → 1 litre, Count → 1 piece. The
// user never picks a purchase/base unit manually. Internally we still store
// purchase_quantity=1 + the canonical purchase/base unit, so the existing costing
// engine is unchanged.
export type MeasurementType = "weight" | "volume" | "count";

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, string> = {
  weight: "Weight (per 1 kg)",
  volume: "Liquid (per 1 litre)",
  count: "Count (per 1 piece)",
};

/** Canonical purchase basis for a measurement type. The purchase price is "per 1
 *  of `displayUnit`"; `baseUnitsPerCanonical` = base units in one purchase unit. */
export function canonicalPurchase(type: MeasurementType): {
  purchase_unit: string;
  base_unit: string;
  baseUnitsPerCanonical: number;
  displayUnit: string;
} {
  if (type === "volume") return { purchase_unit: "Litre", base_unit: "ML", baseUnitsPerCanonical: 1000, displayUnit: "1 litre" };
  if (type === "count") return { purchase_unit: "Piece", base_unit: "Piece", baseUnitsPerCanonical: 1, displayUnit: "1 piece" };
  return { purchase_unit: "KG", base_unit: "Gram", baseUnitsPerCanonical: 1000, displayUnit: "1 kg" };
}

/** Derive a material's measurement type from its stored base unit (edit + migration):
 *  volume base (ML) → liquid, weight base (Gram) → weight, everything else → count. */
export function measurementTypeFromBaseUnit(baseUnit: string): MeasurementType {
  const fam = getUnitFamily(baseUnit);
  if (fam === "volume") return "volume";
  if (fam === "weight") return "weight";
  return "count";
}
