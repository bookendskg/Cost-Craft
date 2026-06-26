import { Package, Receipt, Tag, Percent, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatINR } from "@/lib/utils";
import { round2 } from "@/lib/costing";
import { fcTone, type FcTone } from "@/features/recipes/recipeMetrics";

const TONE_TEXT: Record<FcTone, string> = {
  good: "text-emerald-600",
  warn: "text-amber-600",
  bad: "text-red-600",
};

interface CostSummaryProps {
  /** Ingredient cost incl. wastage (per portion / single-portion recipe). */
  recipeCost: number;
  packagingCost: number;
  /** Price the metrics use — the chef-set menu price, or the suggested price. */
  sellingPrice: number;
  /** True when `sellingPrice` is the suggested fallback (no menu price set). */
  isSuggested: boolean;
  foodCostPct: number;
  criticalPct?: number;
}

/** A compact metric tile. */
function Stat({
  icon,
  label,
  value,
  hint,
  className,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  className?: string;
  valueClass?: string;
}) {
  return (
    <Card className={cn("p-3", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 text-lg font-bold", valueClass)}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function CostSummary({
  recipeCost,
  packagingCost,
  sellingPrice,
  isSuggested,
  foodCostPct,
  criticalPct = 35,
}: CostSummaryProps) {
  const fullCost = round2(recipeCost + packagingCost);
  const profit = round2(sellingPrice - fullCost);
  const fcPct = sellingPrice > 0 ? round2((fullCost / sellingPrice) * 100) : 0;
  const marginPct = sellingPrice > 0 ? round2((profit / sellingPrice) * 100) : 0;
  const tone = fcTone(fcPct, criticalPct);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Cost Summary</p>
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={<Receipt className="h-3.5 w-3.5" />} label="Recipe Cost" value={formatINR(recipeCost)} />
        <Stat icon={<Package className="h-3.5 w-3.5" />} label="Packaging" value={formatINR(packagingCost)} />
        <Stat
          icon={<Tag className="h-3.5 w-3.5" />}
          label="Selling Price"
          value={formatINR(sellingPrice)}
          hint={isSuggested ? `Suggested @ ${foodCostPct}%` : "Your menu price"}
          className="col-span-2"
        />
        <Stat
          icon={<Percent className="h-3.5 w-3.5" />}
          label="Food Cost %"
          value={`${fcPct}%`}
          valueClass={TONE_TEXT[tone]}
        />
        <Stat icon={<TrendingUp className="h-3.5 w-3.5" />} label="Gross Margin" value={`${marginPct}%`} />
        <Stat
          icon={<Wallet className="h-3.5 w-3.5" />}
          label="Profit / Portion"
          value={formatINR(profit)}
          className="col-span-2"
        />
      </div>
    </div>
  );
}
