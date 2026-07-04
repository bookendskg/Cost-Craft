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
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { materialSchema, type MaterialValues } from "@/lib/validation/schemas";
import {
  canonicalPurchase,
  measurementTypeFromBaseUnit,
  MEASUREMENT_TYPE_LABELS,
  type MeasurementType,
} from "@/lib/units";
import { round2 } from "@/lib/costing";
import { formatINR } from "@/lib/utils";
import type { RawMaterial } from "@/lib/data/types";
import { useCreateMaterial, useUpdateMaterial } from "./hooks";
import { useCategories } from "@/features/settings/hooks";
import { toast } from "@/components/ui/use-toast";

const TYPES: MeasurementType[] = ["weight", "volume", "count"];

export function MaterialForm({
  open,
  onOpenChange,
  material,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: RawMaterial | null;
}) {
  const { data: categories = [] } = useCategories();
  const createMut = useCreateMaterial();
  const updateMut = useUpdateMaterial();
  const isEdit = !!material;

  const form = useForm<MaterialValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      ingredient_name: "",
      category: "",
      notes: "",
      purchase_price: undefined as unknown as number,
      measurement_type: "weight",
    },
  });

  const { register, handleSubmit, reset, watch, setValue, formState } = form;

  useEffect(() => {
    if (!open) return;
    if (material) {
      const type = measurementTypeFromBaseUnit(material.base_unit);
      const canon = canonicalPurchase(type);
      // Normalise the stored price to "per 1 canonical unit" regardless of any
      // legacy purchase_quantity, so editing never misrepresents (or corrupts) it.
      const normalizedPrice =
        material.cost_per_base_unit != null
          ? round2(material.cost_per_base_unit * canon.baseUnitsPerCanonical)
          : (material.purchase_price ?? (undefined as unknown as number));
      reset({
        ingredient_name: material.ingredient_name,
        category: material.category,
        notes: material.notes ?? "",
        purchase_price: normalizedPrice,
        measurement_type: type,
      });
    } else {
      reset({
        ingredient_name: "",
        category: categories[0] ?? "",
        notes: "",
        purchase_price: undefined as unknown as number,
        measurement_type: "weight",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, material]);

  const price = watch("purchase_price");
  const type = watch("measurement_type");
  const canon = canonicalPurchase(type);
  const costPerBase =
    price != null && price > 0 ? round2(price / canon.baseUnitsPerCanonical) : null;

  const onSubmit = async (values: MaterialValues) => {
    const c = canonicalPurchase(values.measurement_type);
    const input = {
      ingredient_name: values.ingredient_name,
      category: values.category,
      notes: values.notes || null,
      purchase_price: values.purchase_price ?? null,
      // Derived internally — the user never picks units. purchase_quantity is
      // always 1 so the price is "per 1 kg / 1 litre / 1 piece".
      purchase_quantity: 1,
      purchase_unit: c.purchase_unit,
      base_unit: c.base_unit,
    };
    try {
      if (isEdit && material) {
        await updateMut.mutateAsync({ id: material.id, input });
        toast.success("Ingredient updated");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Ingredient added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
          <DialogDescription>
            Price is per one purchase unit ({canon.displayUnit}), set automatically from the material type.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ingredient Name *</Label>
            <Input {...register("ingredient_name")} />
            {formState.errors.ingredient_name && (
              <p className="text-xs text-destructive">{formState.errors.ingredient_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Category *</Label>
            <Select value={watch("category")} onValueChange={(v) => setValue("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors.category && (
              <p className="text-xs text-destructive">{formState.errors.category.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Material Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => setValue("measurement_type", v as MeasurementType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEASUREMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Unit</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-medium">
                {canon.displayUnit}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Purchase Price (₹ per {canon.displayUnit}) *</Label>
            <CurrencyInput
              value={price ?? undefined}
              onChange={(v) => setValue("purchase_price", v ?? null, { shouldValidate: true })}
              placeholder="Leave blank if price is pending"
            />
            {formState.errors.purchase_price && (
              <p className="text-xs text-destructive">{formState.errors.purchase_price.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">Cost Per {canon.base_unit}</span>
            <span className="font-semibold">
              {costPerBase !== null ? `${formatINR(costPerBase)} / ${canon.base_unit}` : "—"}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea {...register("notes")} placeholder="Optional — storage, brand, prep notes…" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Save Ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
