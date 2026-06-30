import { useMemo, useState } from "react";
import { Loader2, Package } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { toast } from "@/components/ui/use-toast";
import { formatINR } from "@/lib/utils";
import { useDashboardBrand } from "@/features/dashboard/brandTheme";
import { useRecipes, useSetPackaging } from "@/features/recipes/hooks";

/** Packaging Cost — per-recipe box/container cost, layered on top of food cost.
 *  Brand-scoped; both pizza sizes (11"/15") are listed so each box cost is editable. */
export function PackagingPage() {
  const { data: recipes = [], isLoading, isError } = useRecipes();
  const brand = useDashboardBrand((s) => s.brand);
  const setPackaging = useSetPackaging();
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const rows = useMemo(
    () =>
      recipes
        .filter((r) => !r.is_prep)
        .filter((r) => brand === "all" || r.brand === brand)
        .filter((r) => !search || r.recipe_name.toLowerCase().includes(search.toLowerCase()))
        .sort(
          (a, b) =>
            a.recipe_name.localeCompare(b.recipe_name) || (a.size_label ?? "").localeCompare(b.size_label ?? ""),
        ),
    [recipes, brand, search],
  );

  const totalPackaging = rows.reduce((s, r) => s + (r.packaging_cost ?? 0), 0);
  const withPackaging = rows.filter((r) => (r.packaging_cost ?? 0) > 0).length;

  const clearDraft = (id: string) =>
    setDrafts((d) => {
      const n = { ...d };
      delete n[id];
      return n;
    });

  const save = async (id: string, current: number) => {
    const raw = drafts[id];
    if (raw === undefined) return;
    const val = parseFloat(raw);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Enter a valid packaging cost (0 or more)");
      return;
    }
    if (val === current) {
      clearDraft(id);
      return;
    }
    try {
      await setPackaging.mutateAsync({ id, packagingCost: val });
      clearDraft(id);
      toast.success("Packaging cost updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Packaging Cost"
        description="Per-recipe packaging (box/container) cost, added on top of the food cost when computing margin and FC%."
      />

      <Card className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search recipe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>
            {withPackaging} of {rows.length} have packaging
          </span>
          <span>
            Total: <span className="font-semibold text-foreground">{formatINR(totalPackaging)}</span>
          </span>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : isError ? (
          <div className="py-12 text-center text-sm text-destructive">
            Unable to load recipes. Please refresh and try again.
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="No recipes"
            description="No recipes match the current brand or search."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Packaging ₹</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const current = r.packaging_cost ?? 0;
                const draft = drafts[r.id];
                const dirty = draft !== undefined && parseFloat(draft) !== current;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.recipe_name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.category}</TableCell>
                    <TableCell className="text-muted-foreground">{r.size_label ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="ml-auto h-8 w-28 text-right"
                        value={draft ?? String(current)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") save(r.id, current);
                        }}
                        aria-label={`Packaging cost for ${r.recipe_name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!dirty || setPackaging.isPending}
                        onClick={() => save(r.id, current)}
                      >
                        {setPackaging.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
