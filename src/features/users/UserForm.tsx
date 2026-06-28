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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userSchema, type UserValues } from "@/lib/validation/schemas";
import { toast } from "@/components/ui/use-toast";
import { BRANDS, ROLE_LABELS, outletsForBrand, type Brand, type User } from "@/lib/data/types";
import { useCreateUser, useUpdateUser } from "./hooks";

export function UserForm({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
}) {
  const isEdit = !!user;
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", role: "rnd", status: "active", password: "" },
  });

  useEffect(() => {
    if (open) {
      reset(
        user
          ? {
              name: user.name,
              email: user.email,
              role: user.role,
              status: user.status,
              assigned_brand: user.assigned_brand ?? null,
              assigned_outlet: user.assigned_outlet ?? null,
              password: "",
            }
          : { name: "", email: "", role: "rnd", status: "active", assigned_brand: null, assigned_outlet: null, password: "" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const onSubmit = async (values: UserValues) => {
    // Outlet scoping only applies to Outlet Manager / Staff; clear it otherwise.
    const scoped = values.role === "outlet_manager" || values.role === "staff";
    const assigned_brand = scoped ? values.assigned_brand ?? null : null;
    const assigned_outlet = scoped ? values.assigned_outlet ?? null : null;
    try {
      if (isEdit && user) {
        await updateMut.mutateAsync({
          id: user.id,
          patch: {
            name: values.name,
            email: values.email,
            role: values.role,
            status: values.status,
            assigned_brand,
            assigned_outlet,
            password: values.password || undefined,
          },
        });
        toast.success("User updated");
      } else {
        if (!values.password) {
          toast.error("Password is required for a new user");
          return;
        }
        await createMut.mutateAsync({
          name: values.name,
          email: values.email,
          role: values.role,
          status: values.status,
          assigned_brand,
          assigned_outlet,
          password: values.password,
        });
        toast.success("User created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update profile, role, or status." : "Add a new user and assign a role."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={watch("role")} onValueChange={(v) => setValue("role", v as UserValues["role"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="rnd">{ROLE_LABELS.rnd}</SelectItem>
                  <SelectItem value="outlet_manager">{ROLE_LABELS.outlet_manager}</SelectItem>
                  <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                  <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as UserValues["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(watch("role") === "outlet_manager" || watch("role") === "staff") && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label>Assigned Brand</Label>
                <Select
                  value={watch("assigned_brand") ?? "none"}
                  onValueChange={(v) => {
                    setValue("assigned_brand", v === "none" ? null : (v as Brand));
                    setValue("assigned_outlet", null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any brand</SelectItem>
                    {BRANDS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Outlet</Label>
                <Select
                  value={watch("assigned_outlet") ?? "none"}
                  onValueChange={(v) => setValue("assigned_outlet", v === "none" ? null : v)}
                  disabled={!watch("assigned_brand")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any outlet</SelectItem>
                    {watch("assigned_brand") &&
                      outletsForBrand(watch("assigned_brand") as Brand).map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>{isEdit ? "New Password (optional)" : "Temporary Password *"}</Label>
            <Input type="password" autoComplete="new-password" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
