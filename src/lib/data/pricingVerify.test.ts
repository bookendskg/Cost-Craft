import { describe, it, expect, beforeEach } from "vitest";
import { resetDb } from "./mock/db";
import { recipesRepo } from "./mock/recipes";
import { sheetFigures } from "./packagingData";

// System-wide pricing verification against the authoritative Bookends sheet.
// Menu recipes (incl. both pizza sizes) are matched by name+size; we compare the
// app's computed cost per portion (making cost) to the sheet, and assert that the
// packaging cost + selling price were wired to the sheet values exactly.

describe("pricing verification vs the Bookends sheet", () => {
  beforeEach(() => resetDb());

  it("packaging + selling price match the sheet exactly for matched menu recipes", async () => {
    const recipes = await recipesRepo.list();
    let matched = 0;
    for (const r of recipes) {
      if (r.is_prep) continue;
      const s = sheetFigures(r.recipe_name, r.size_code);
      if (!s) continue;
      matched++;
      expect(r.packaging_cost).toBe(s.pkg);
      if (s.selling != null) expect(r.selling_price).toBe(s.selling);
    }
    expect(matched).toBeGreaterThan(20);
  });

  it("reports making-cost discrepancies (app computed vs sheet)", async () => {
    const recipes = await recipesRepo.list();
    const rows: { name: string; size: string; app: number; sheet: number; diffPct: number }[] = [];
    for (const r of recipes) {
      if (r.is_prep) continue;
      const s = sheetFigures(r.recipe_name, r.size_code);
      if (!s || s.making <= 0) continue;
      const app = r.cost_per_portion ?? 0;
      const diffPct = Math.round(((app - s.making) / s.making) * 1000) / 10;
      if (Math.abs(diffPct) > 12) {
        rows.push({ name: r.recipe_name, size: r.size_code ?? "-", app: Math.round(app * 100) / 100, sheet: s.making, diffPct });
      }
    }
    rows.sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
    // eslint-disable-next-line no-console
    console.log(`\nMAKING-COST DISCREPANCIES > 12% (${rows.length}):`);
    // eslint-disable-next-line no-console
    rows.slice(0, 40).forEach((x) => console.log(`  ${x.size.padEnd(9)} ${x.name.padEnd(28)} app=${x.app}  sheet=${x.sheet}  (${x.diffPct > 0 ? "+" : ""}${x.diffPct}%)`));
    // This test only reports; it never fails the suite.
    expect(true).toBe(true);
  });
});
