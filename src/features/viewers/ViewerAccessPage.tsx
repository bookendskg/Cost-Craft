import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { BRANDS, type Brand } from "@/lib/data/types";
import { viewerBrands, viewerShowCost } from "@/lib/auth/permissions";
import { useUpdateUser, useViewers } from "@/features/users/hooks";

export function ViewerAccessPage() {
  const { viewers, isLoading } = useViewers();
  const updateUser = useUpdateUser();

  const toggleBrand = async (userId: string, current: Brand[], brand: Brand, on: boolean) => {
    const next = on ? [...new Set([...current, brand])] : current.filter((b) => b !== brand);
    // Writing the explicit list turns the default-everything into a restriction.
    await updateUser.mutateAsync({ id: userId, patch: { accessible_brands: next } });
    toast.success("Access updated");
  };

  const toggleCost = async (userId: string, show: boolean) => {
    await updateUser.mutateAsync({ id: userId, patch: { show_cost: show } });
    toast.success(show ? "Costs shown for this viewer" : "Costs hidden for this viewer");
  };

  return (
    <>
      <PageHeader
        title="Viewer Access"
        description="Viewers see everything by default. Uncheck a brand to restrict a viewer to particular items."
      />

      <Card>
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : viewers.length === 0 ? (
          <EmptyState title="No viewers yet" description="Create a user with the Viewer role to grant access." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Viewer</TableHead>
                {BRANDS.map((b) => (
                  <TableHead key={b.value} className="text-center">{b.label}</TableHead>
                ))}
                <TableHead className="text-center">Show Costs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewers.map((v) => {
                const brands = viewerBrands(v); // unset → all (everything)
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-muted-foreground">{v.email}</div>
                    </TableCell>
                    {BRANDS.map((b) => (
                      <TableCell key={b.value} className="text-center">
                        <Checkbox
                          checked={brands.includes(b.value)}
                          onCheckedChange={(c) => toggleBrand(v.id, brands, b.value, !!c)}
                        />
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Checkbox
                        checked={viewerShowCost(v)}
                        onCheckedChange={(c) => toggleCost(v.id, !!c)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Both brands checked = full access (the default). Uncheck one to limit the viewer to the
        other. A viewer sees all <strong>approved</strong> recipes of their checked brands. "Show
        Costs" off hides ingredient costs, totals, and pricing.
      </p>
    </>
  );
}
