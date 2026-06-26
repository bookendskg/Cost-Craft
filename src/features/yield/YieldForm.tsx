import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { yieldSchema, type YieldValues } from "@/lib/validation/schemas";
import { PURCHASE_UNITS, getUnitFamily } from "@/lib/units";
import { computeYield, toBaseQuantity } from "@/lib/yield";
import { formatINR } from "@/lib/utils";
import { todayISO } from "@/lib/data/mock/db";
import type { IngredientYield } from "@/lib/data/types";
import { useMaterials } from "@/features/raw-materials/hooks";
import { useCreateYield, useUpdateYield } from "./hooks";
import { toast } from "@/components/ui/use-toast";

const baseUnitOf = (unit: string) => {
  const fam = getUnitFamily(unit);
  return fam === "weight" ? "Gram" : fam === "volume" ? "ML" : unit;
};

export function YieldForm({
  open,
  onOpenChange,
  record,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record?: IngredientYield | null;
}) {
  const { data: materials = [] } = useMaterials();
  const createMut = useCreateYield();
  const updateMut = useUpdateYield();
  const isEdit = !!record;

  const form = useForm<YieldValues>({
    resolver: zodResolver(yieldSchema),
    defaultValues: {
      ingredient_id: "",
      purchase_cost: undefined as unknown as number,
      purchase_quantity: 1,
      purchase_unit: "KG",
      wastage_quantity: undefined as unknown as number,
      effective_from: todayISO(),
      notes: "",
    },
  });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;

  useEffect(() => {
    if (!open) return;
    reset(
      record
        ? {
            ingredient_id: record.ingredient_id,
            purchase_cost: record.purchase_cost,
            purchase_quantity: record.purchase_quantity,
            purchase_unit: record.purchase_unit as YieldValues["purchase_unit"],
            wastage_quantity: record.wastage_quantity,
            effective_from: record.effective_from,
            notes: record.notes ?? "",
          }
        : {
            ingredient_id: "",
            purchase_cost: undefined as unknown as number,
            purchase_quantity: 1,
            purchase_unit: "KG",
            wastage_quantity: undefined as unknown as number,
            effective_from: todayISO(),
            notes: "",
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  const ingredientId = watch("ingredient_id");
  const cost = watch("purchase_cost");
  const qty = watch("purchase_quantity");
  const unit = watch("purchase_unit");
  const wastage = watch("wastage_quantity");
  const baseUnit = baseUnitOf(unit);

  // Prefill purchase details from the chosen ingredient's current pricing.
  const onPickIngredient = (id: string) => {
    setValue("ingredient_id", id);
    const m = materials.find((x) => x.id === id);
    if (m && !isEdit) {
      if (m.purchase_price != null) setValue("purchase_cost", m.purchase_price, { shouldValidate: true });
      setValue("purchase_quantity", m.purchase_quantity || 1);
      setValue("purchase_unit", m.purchase_unit as YieldValues["purchase_unit"]);
    }
  };

  const preview =
    cost > 0 && qty > 0 && wastage != null && wastage >= 0 && wastage < toBaseQuantity(qty, unit)
      ? computeYield({ purchaseCost: cost, purchaseQuantity: qty, purchaseUnit: unit, wastageQty: wastage })
      : null;

  const onSubmit = async (values: YieldValues) => {
    const input = {
      ingredient_id: values.ingredient_id,
      purchase_cost: values.purchase_cost,
      purchase_quantity: values.purchase_quantity,
      purchase_unit: values.purchase_unit,
      wastage_quantity: values.wastage_quantity,
      wastage_unit: baseUnitOf(values.purchase_unit),
      effective_from: values.effective_from,
      notes: values.notes || null,
    };
    try {
      if (isEdit && record) {
        await updateMut.mutateAsync({ id: record.id, input });
        toast.success("Yield information updated successfully.");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Yield information added successfully.");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Yield" : "Add Yield"}</DialogTitle>
          <DialogDescription>
            The full purchase cost is distributed across the usable quantity after wastage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ingredient *</Label>
            <Select value={ingredientId} onValueChange={onPickIngredient} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Select ingredient" />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.ingredient_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.ingredient_id && (
              <p className="text-xs text-destructive">{formState.errors.ingredient_id.message}</p>
            )}
          </div>

          <div className="rounded-md border p-3">
            <p className="mb-3 text-sm font-medium">Purchase</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Purchase Cost (₹) *</Label>
                <CurrencyInput
                  value={cost ?? undefined}
                  onChange={(v) => setValue("purchase_cost", v as number, { shouldValidate: true })}
                  placeholder="0.00"
                />
                {formState.errors.purchase_cost && (
                  <p className="text-xs text-destructive">{formState.errors.purchase_cost.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Quantity *</Label>
                <Input
                  type="number"
                  step="0.001"
                  {...register("purchase_quantity", { valueAsNumber: true })}
                />
                {formState.errors.purchase_quantity && (
                  <p className="text-xs text-destructive">{formState.errors.purchase_quantity.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Unit *</Label>
                <Select value={unit} onValueChange={(v) => setValue("purchase_unit", v as YieldValues["purchase_unit"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PURCHASE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Wastage ({baseUnit}) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  {...register("wastage_quantity", { valueAsNumber: true })}
                />
                {formState.errors.wastage_quantity && (
                  <p className="text-xs text-destructive">{formState.errors.wastage_quantity.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Live, read-only derived values */}
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/50 p-3 text-sm">
            <Derived label={`Raw Quantity (${baseUnit})`} value={preview ? String(preview.rawQtyBase) : "—"} />
            <Derived label={`Usable Quantity (${baseUnit})`} value={preview ? String(preview.usableQty) : "—"} />
            <Derived label="Wastage %" value={preview ? `${preview.wastagePct}%` : "—"} />
            <Derived label="Yield %" value={preview ? `${preview.yieldPct}%` : "—"} />
            <Derived label="Original Unit Cost" value={preview ? `${formatINR(preview.originalUnitCost)}/${baseUnit}` : "—"} />
            <Derived
              label="Yield-Adjusted Cost"
              value={preview ? `${formatINR(preview.yieldAdjustedUnitCost)}/${baseUnit}` : "—"}
              strong
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Effective Date *</Label>
              <Input type="date" {...register("effective_from")} />
              {formState.errors.effective_from && (
                <p className="text-xs text-destructive">{formState.errors.effective_from.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register("notes")} placeholder="Optional" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Save Yield"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Derived({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold text-foreground" : "font-medium"}>{value}</span>
    </div>
  );
}
