import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useUnsavedChanges, useFormDirty } from "@/lib/hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brandSchema, type BrandValues } from "@/lib/validation/schemas";
import { toast } from "@/components/ui/use-toast";
import type { BrandRecord } from "@/lib/data/types";
import { useCreateBrand, useUpdateBrand } from "./hooks";

const EMPTY: BrandValues = {
  name: "",
  brand_code: "",
  display_name: "",
  accent_color: "",
  status: "active",
  notes: "",
};

export function BrandForm({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: BrandRecord | null;
}) {
  const isEdit = !!brand;
  const createMut = useCreateBrand();
  const updateMut = useUpdateBrand();

  const form = useForm<BrandValues>({ resolver: zodResolver(brandSchema), defaultValues: EMPTY });
  const { register, handleSubmit, reset, watch, setValue, formState } = form;
  const { errors } = formState;

  const { dirty, capture, markSaved } = useFormDirty(form, open);
  const unsaved = useUnsavedChanges(dirty);

  useEffect(() => {
    if (open) {
      reset(
        brand
          ? {
              name: brand.name,
              brand_code: brand.brand_code,
              display_name: brand.display_name,
              accent_color: brand.accent_color ?? "",
              status: brand.status,
              notes: brand.notes ?? "",
            }
          : EMPTY,
      );
      capture();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brand]);

  const onSubmit = async (values: BrandValues) => {
    try {
      const input = {
        name: values.name,
        brand_code: values.brand_code,
        display_name: values.display_name || values.name,
        accent_color: values.accent_color || null,
        status: values.status,
        notes: values.notes || null,
      };
      if (isEdit && brand) {
        await updateMut.mutateAsync({ id: brand.id, input });
        toast.success("Brand updated");
      } else {
        await createMut.mutateAsync(input);
        toast.success("Brand created");
      }
      markSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : unsaved.guardClose(() => onOpenChange(false)))}>
      <DialogContent lockClose className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Brand" : "New Brand"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this brand." : "Add a new restaurant brand, then add its outlets."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Brand Name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Brand Code *</Label>
              <Input {...register("brand_code")} placeholder="e.g. CAP" />
              {errors.brand_code && <p className="text-xs text-destructive">{errors.brand_code.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Display Name</Label>
            <Input {...register("display_name")} placeholder="Defaults to the brand name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Accent Colour</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="h-9 w-12 shrink-0 p-1"
                  value={watch("accent_color") || "#888888"}
                  onChange={(e) => setValue("accent_color", e.target.value)}
                />
                <Input {...register("accent_color")} placeholder="#ed1c24" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as BrandValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => unsaved.guardClose(() => onOpenChange(false))}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Brand"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <UnsavedChangesDialog
      open={unsaved.promptOpen}
      onContinueEditing={unsaved.continueEditing}
      onDiscard={unsaved.discardChanges}
      message="You have unsaved changes in this brand. If you leave now, all entered information will be lost."
    />
    </>
  );
}
