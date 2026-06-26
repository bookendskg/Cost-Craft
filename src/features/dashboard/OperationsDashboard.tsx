import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PiggyBank, UtensilsCrossed, AlertTriangle, Coins, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatINR } from "@/lib/utils";
import { BRANDS } from "@/lib/data/types";
import type { BrandSelection } from "./BrandFilter";
import { useRecipes } from "@/features/recipes/hooks";
import { useFoodCostPct, useAllSettings } from "@/features/settings/hooks";
import { useAllRecipeIngredients } from "@/features/reports/hooks";
import {
  foodCostPctOf,
  menuPriceOf,
  profitMarginOf,
  fcTone,
  FC_TONE_STYLES,
} from "@/features/recipes/recipeMetrics";

// Brand accent theming for the dashboard data lines.
const THEME: Record<BrandSelection, { bar: string; accentText: string }> = {
  all: { bar: "bg-[#1b35a8]", accentText: "text-[#1b35a8]" }, // BOOKENDS blue
  capiche: { bar: "bg-[#ed1c24]", accentText: "text-[#ed1c24]" }, // Capiche red
  aiko: { bar: "bg-amber-400", accentText: "text-amber-600" }, // Aiko gold
};
const TONE_LABEL = { good: "On Target", warn: "Watch", bad: "Over" } as const;

export function OperationsDashboard({ brand }: { brand: BrandSelection }) {
  const t = THEME[brand];
  const navigate = useNavigate();
  const brandLabel = brand === "all" ? "BOOKENDS" : BRANDS.find((b) => b.value === brand)?.label ?? brand;
  const { data: recipes = [] } = useRecipes();
  const { data: foodCostPct = 30 } = useFoodCostPct();
  const { data: settings = [] } = useAllSettings();
  const ingredients = useAllRecipeIngredients();

  const criticalPct = Number(settings.find((s) => s.key === "margin_alert_pct")?.value ?? 35);

  // Real menu recipes for the selected brand (deduped by id; preps excluded).
  const items = useMemo(() => {
    const seen = new Set<string>();
    return recipes.filter((r) => {
      if (r.is_prep) return false;
      if (brand !== "all" && r.brand !== brand) return false;
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [recipes, brand]);
  const itemIds = useMemo(() => new Set(items.map((r) => r.id)), [items]);

  const rows = useMemo(
    () =>
      items
        .map((r) => ({
          id: r.id,
          name: r.recipe_name,
          category: r.category,
          cost: r.cost_per_portion ?? 0,
          price: menuPriceOf(r, foodCostPct),
          margin: profitMarginOf(r, foodCostPct),
          fc: foodCostPctOf(r, foodCostPct),
        }))
        .sort((a, b) => b.fc - a.fc),
    [items, foodCostPct],
  );

  const avgFc = rows.length ? rows.reduce((s, r) => s + r.fc, 0) / rows.length : 0;
  const avgCost = rows.length ? rows.reduce((s, r) => s + r.cost, 0) / rows.length : 0;
  const overTarget = rows.filter((r) => r.fc > criticalPct).length;

  // Cost by ingredient category, summed across the selected brand's recipes (real).
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (ingredients.data ?? []).forEach((i) => {
      if (!itemIds.has(i.recipe_id) || !i.material || i.calculated_cost == null) return;
      map.set(i.material.category, (map.get(i.material.category) ?? 0) + i.calculated_cost);
    });
    const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
    return [...map.entries()]
      .map(([name, cost]) => ({ name, cost, pct: Math.round((cost / total) * 100) }))
      .sort((a, b) => b.cost - a.cost);
  }, [ingredients.data, itemIds]);

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Costing Dashboard</h1>
        <p className="text-sm opacity-80">Recipe cost &amp; margin overview — {brandLabel}</p>
      </div>

      {/* KPI cards (all derived from your recipe data) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<PiggyBank className={cn("h-5 w-5", t.accentText)} />} label="Avg Food Cost %" value={`${avgFc.toFixed(1)}%`}>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${Math.min(100, avgFc * 2)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Target {foodCostPct.toFixed(0)}%</p>
        </Kpi>
        <Kpi icon={<UtensilsCrossed className={cn("h-5 w-5", t.accentText)} />} label="Menu Items" value={`${rows.length}`}>
          <p className="mt-3 text-xs text-muted-foreground">Active recipes ({brandLabel})</p>
        </Kpi>
        <Kpi icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Over Target" value={`${overTarget}`}>
          <p className="mt-3 text-xs text-muted-foreground">Above {criticalPct}% food cost</p>
        </Kpi>
        <Kpi icon={<Coins className="h-5 w-5 text-emerald-600" />} label="Avg Dish Cost" value={formatINR(avgCost).replace(".00", "")}>
          <p className="mt-3 text-xs text-muted-foreground">Cost per portion</p>
        </Kpi>
      </div>

      {/* Recipe cost breakdown (left) + Cost by Category (right) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="mb-3 text-sm font-semibold">Recipe Cost Breakdown</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead className="text-right">Cost / Portion</TableHead>
                <TableHead className="text-right">Menu Price</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Food Cost %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No recipes for this brand.</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const tone = fcTone(r.fc, criticalPct);
                  return (
                    <TableRow key={r.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => navigate(`/recipes/${r.id}`)}>
                      <TableCell>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.category}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatINR(r.cost).replace(".00", "")}</TableCell>
                      <TableCell className="text-right font-mono">{formatINR(r.price).replace(".00", "")}</TableCell>
                      <TableCell className="text-right font-mono">{formatINR(r.margin).replace(".00", "")}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", FC_TONE_STYLES[tone].badge)}>
                          {r.fc.toFixed(1)}% · {TONE_LABEL[tone]}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold">Cost by Category</p>
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-4">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data.</p>
            ) : (
              byCategory.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-semibold">{c.pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 space-y-1 border-t pt-4 text-xs">
            <p className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", t.bar)} /> Target Food Cost: {foodCostPct.toFixed(1)}%</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-900" /> Actual Food Cost: {avgFc.toFixed(1)}%</p>
            <p className="pt-1 italic text-muted-foreground">
              Variance: {avgFc - foodCostPct >= 0 ? "+" : ""}{(avgFc - foodCostPct).toFixed(1)}%
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {children}
    </Card>
  );
}
