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
