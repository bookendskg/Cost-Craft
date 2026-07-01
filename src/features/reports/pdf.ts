// PDF export — PRD §6.2 / §13.1. Uses pdfmake. Cost columns are omitted when
// the viewer's visibility hides them (Capiche view).

import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { calculateIngredientCost, round2 } from "@/lib/costing";
import { canConvert } from "@/lib/units";
import { formatINR, formatUnit } from "@/lib/utils";
import { BRANDS, ROLE_LABELS, type Recipe, type RecipeIngredientWithMaterial, type Role } from "@/lib/data/types";
import type { ViewVisibility } from "@/lib/auth/permissions";

/** Who exported + when — stamped by the caller from the authenticated session. */
export interface PdfExporter {
  name: string;
  role: string;
}

/** Current date/time formatted in the operating timezone (Asia/Kolkata / IST). */
function istStamp() {
  const now = new Date();
  const date = now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" });
  const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });
  return { date, time, label: `${date}, ${time} IST` };
}

/** Lazy-load pdfmake + fonts only when an export is requested.
 *  pdfmake ≤0.2.15 shipped vfs_fonts as `{ pdfMake: { vfs } }`; ≥0.2.16 (we're on
 *  0.2.23) exports the raw vfs map directly (`module.exports = vfs`), which lands on
 *  `.default` under Vite's CJS interop. Resolve all shapes so the fonts always load —
 *  a missing vfs is what silently broke export ("Roboto-Regular.ttf not found"). */
async function loadPdfMake() {
  const [pdfmakeMod, fontsMod] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);
  const pdfMake = ((pdfmakeMod as { default?: unknown }).default ?? pdfmakeMod) as {
    vfs: Record<string, string>;
    createPdf: (doc: TDocumentDefinitions) => { download: (name: string) => void; getBlob: (cb: (b: Blob) => void) => void };
  };
  const fonts = (fontsMod as { default?: unknown }).default ?? fontsMod;
  const asShape = fonts as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> };
  const vfs = asShape.pdfMake?.vfs ?? asShape.vfs ?? (fonts as Record<string, string>);
  pdfMake.vfs = vfs;
  return pdfMake;
}

export async function generateRecipePdf(
  recipe: Recipe,
  ingredients: RecipeIngredientWithMaterial[],
  foodCostPct: number,
  opts: { visibility?: ViewVisibility; exporter?: PdfExporter } = {},
) {
  const { visibility, exporter } = opts;
  // Financial fields are dropped here (before generation), not merely hidden in UI —
  // a Viewer / restricted export never contains cost data in the file.
  const showCost = visibility ? visibility.totalCost : true;
  const showUnitCost = visibility ? visibility.unitCosts : true;
  const showPrice = visibility ? visibility.sellingPrice : true;

  // Brand comes from the stored recipe.brand — never from on-screen text.
  const brandLabel = BRANDS.find((b) => b.value === recipe.brand)?.label ?? recipe.brand;
  const stamp = istStamp();

  const headRow = ["#", "Ingredient", "Qty", "Unit"];
  if (showUnitCost) headRow.push("Unit Cost");
  if (showCost) headRow.push("Total");

  const body: string[][] = [headRow];
  ingredients.forEach((ing, idx) => {
    const isSub = ing.component_type === "recipe";
    const m = ing.material;
    const name = isSub
      ? `${ing.subRecipe?.recipe_name ?? "Sub-recipe"}  ·  sub-recipe`
      : m?.ingredient_name ?? "—";
    const cost =
      ing.calculated_cost != null
        ? round2(ing.calculated_cost)
        : !isSub && m && m.cost_per_base_unit !== null && canConvert(ing.unit_used, m.base_unit)
          ? calculateIngredientCost(m.cost_per_base_unit, ing.quantity_used, ing.unit_used, m.base_unit)
          : null;
    const row = [String(idx + 1), name, String(ing.quantity_used), formatUnit(ing.unit_used)];
    if (showUnitCost) row.push(isSub ? "—" : formatINR(m?.cost_per_base_unit ?? null));
    if (showCost) row.push(formatINR(cost));
    body.push(row);
  });

  const total = recipe.total_cost ?? 0;
  const perPortion = recipe.cost_per_portion ?? 0;
  const packaging = recipe.packaging_cost ?? 0;
  const fullPerPortion = round2(perPortion + packaging);
  const suggested = fullPerPortion > 0 ? round2(fullPerPortion / (foodCostPct / 100)) : 0;
  const grossProfit = round2(suggested - fullPerPortion);
  const grossMargin = suggested > 0 ? round2((grossProfit / suggested) * 100) : 0;

  const summary: [string, string][] = [];
  if (showCost) {
    summary.push(["Total Recipe Cost", formatINR(total)]);
    summary.push(["Cost Per Portion", formatINR(perPortion)]);
    if (packaging > 0) {
      summary.push(["Packaging / Portion", formatINR(packaging)]);
      summary.push(["Full Cost / Portion", formatINR(fullPerPortion)]);
    }
  }
  if (showPrice && !recipe.is_prep) {
    summary.push(["Food Cost %", `${foodCostPct}%`]);
    summary.push(["Suggested Selling Price", formatINR(suggested)]);
    if (recipe.selling_price != null) summary.push(["Menu Price", formatINR(recipe.selling_price)]);
    summary.push(["Gross Profit", formatINR(grossProfit)]);
    summary.push(["Gross Margin", `${grossMargin}%`]);
  }

  const subtitle = [recipe.category, recipe.is_prep ? "In-House Prep" : null, recipe.size_label ?? null]
    .filter(Boolean)
    .join("  ·  ");
  const method = (recipe.method ?? []).filter((s) => s.trim());
  const roleLabel = exporter ? ROLE_LABELS[exporter.role as Role] ?? exporter.role : "";

  const doc: TDocumentDefinitions = {
    pageMargins: [40, 40, 40, 54],
    footer: (currentPage: number, pageCount: number) => ({
      margin: [40, 14, 40, 0] as [number, number, number, number],
      columns: [
        { text: `${brandLabel} · Generated from CostCraft`, fontSize: 8, color: "#94a3b8" },
        { text: `Page ${currentPage} of ${pageCount}`, alignment: "center" as const, fontSize: 8, color: "#94a3b8" },
        { text: "Confidential", alignment: "right" as const, fontSize: 8, color: "#94a3b8" },
      ],
    }),
    content: [
      {
        columns: [
          [
            { text: "CostCraft", style: "brandMark" },
            { text: "Bookends Hospitality", style: "org" },
          ],
          { text: brandLabel.toUpperCase(), style: "brandName", alignment: "right" as const },
        ],
      },
      { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#e2e8f0" }], margin: [0, 8, 0, 12] as [number, number, number, number] },
      { text: recipe.recipe_name, style: "title" },
      { text: subtitle, style: "subtitle" },
      {
        style: "meta",
        columns: [
          [
            `Generated: ${stamp.label}`,
            exporter ? `Exported by: ${exporter.name} (${roleLabel})` : "",
          ],
          [
            `Type: ${recipe.is_prep ? "In-House Prep" : "Menu Recipe"}`,
            `Yield: ${recipe.yield_quantity} ${formatUnit(recipe.yield_unit)}`,
            recipe.serving_size > 1 ? `Serving Size: ${recipe.serving_size}` : "",
          ],
        ],
      },
      ...(method.length
        ? [{ text: "Preparation", style: "section" }, { ol: method, style: "body" }]
        : recipe.description
          ? [{ text: "Preparation", style: "section" }, { text: recipe.description, style: "body" }]
          : []),
      { text: "Ingredients", style: "section" },
      {
        table: { headerRows: 1, widths: tableWidths(headRow.length), body },
        layout: "lightHorizontalLines",
      },
      ...(summary.length
        ? [
            { text: "Cost Summary", style: "section" },
            {
              table: {
                widths: ["*", "auto"],
                body: summary.map(([k, v]) => [
                  { text: k, color: "#64748b" },
                  { text: v, alignment: "right" as const, bold: true },
                ]),
              },
              layout: "noBorders",
            },
          ]
        : []),
    ],
    styles: {
      brandMark: { fontSize: 15, bold: true, color: "#0f172a" },
      org: { fontSize: 9, color: "#64748b" },
      brandName: { fontSize: 13, bold: true, color: "#0f172a" },
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: "#64748b", margin: [0, 0, 0, 10] },
      meta: { fontSize: 9, margin: [0, 0, 0, 6], lineHeight: 1.3, color: "#334155" },
      section: { fontSize: 12, bold: true, margin: [0, 14, 0, 6] },
      body: { fontSize: 10, lineHeight: 1.3 },
    },
    defaultStyle: { fontSize: 10 },
  };

  const safeName = recipe.recipe_name.replace(/[^\w]+/g, "_").replace(/^_+|_+$/g, "");
  const filename = `${brandLabel}_${safeName}_${stamp.date.replace(/[\s,]+/g, "")}.pdf`;
  const pdfMake = await loadPdfMake();
  pdfMake.createPdf(doc).download(filename);
}

function tableWidths(cols: number): (string | number)[] {
  // first col narrow, ingredient flexible, rest auto
  const widths: (string | number)[] = [18, "*"];
  for (let i = 2; i < cols; i++) widths.push("auto");
  return widths;
}
