// Generate src/lib/data/masterYields.ts from the "Yield" sheet of the costing
// master workbook. Emits the prep-yield geometry (name, section, raw, usable);
// seed.ts handles pricing + material creation. Run: node scripts/gen-master-yields.mjs
import * as XLSX from "xlsx";
import { readFileSync, writeFileSync } from "node:fs";

const wb = XLSX.read(readFileSync("assets/Costing Master sheet.xlsx"), { type: "buffer", raw: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Yield"], { header: 1, defval: null, blankrows: false });

const num = (v) => {
  if (v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const clean = (s) => String(s).replace(/\s+/g, " ").trim();

const SECTION_WORDS = new Set([
  "processed", "chopped", "sliced", "cut", "rings", "diced", "juiced", "whole",
  "other prep", "canned drained weight", "boiled", "zest", "paste", "roasted",
  "dehydrated", "julienne",
]);

let section = "Other";
const out = [];
for (let i = 1; i < rows.length; i++) {
  const [nameRaw, unproc, usable] = rows[i];
  const rawQty = num(unproc);
  const usableQty = num(usable);
  const name = nameRaw == null ? "" : clean(nameRaw);
  // Section header: a label row with no quantities.
  if (name && rawQty == null && usableQty == null) {
    if (SECTION_WORDS.has(name.toLowerCase())) section = name.replace(/\s+/g, " ").trim();
    continue;
  }
  if (!name || rawQty == null || usableQty == null) continue; // skip blanks / dup row
  if (rawQty <= 0 || usableQty <= 0) continue;
  out.push({ name, section, raw: rawQty, usable: usableQty });
}

const header = `// AUTO-GENERATED from assets/Costing Master sheet.xlsx (sheet "Yield").
// Regenerate with: node scripts/gen-master-yields.mjs  — do not edit by hand.
// Each entry is a standard prep yield: raw (unprocessed) -> usable (after trim/prep).
// Boiled/absorption preps have usable > raw (yield > 100%, zero trim wastage).

export interface MasterYield {
  name: string;
  section: string;
  /** Unprocessed weight in grams. */
  raw: number;
  /** Usable weight after prep, in grams. */
  usable: number;
}

export const MASTER_YIELDS: MasterYield[] = ${JSON.stringify(out, null, 2)};
`;

writeFileSync("src/lib/data/masterYields.ts", header);
console.log(`Wrote ${out.length} yield records to src/lib/data/masterYields.ts`);
console.log("Sections:", [...new Set(out.map((r) => r.section))].join(", "));
console.log("Boiled/absorption (usable>raw):", out.filter((r) => r.usable > r.raw).map((r) => r.name).join(", "));
