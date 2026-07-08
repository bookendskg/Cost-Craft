import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Power, Package } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { toast } from "@/components/ui/use-toast";
import { formatINR } from "@/lib/utils";
import { useSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { PACKAGING_TYPE_LABELS, type PackagingItem, type PackagingType } from "@/lib/data/types";
import { usePackagingItems, useDeletePackaging, useSetPackagingStatus } from "./hooks";
import { useBrandScope } from "@/features/brands/useBrandScope";
import { PackagingForm } from "./PackagingForm";

export function PackagingMasterPage() {
  const role = useSession((s) => s.user?.role);
  const canManage = can(role, "packaging.manage");
  const { data: items = [], isLoading } = usePackagingItems();
  const { inPackagingScope } = useBrandScope();
  const delMut = useDeletePackaging();
  const statusMut = useSetPackagingStatus();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PackagingItem | null>(null);
  const [deleting, setDeleting] = useState<PackagingItem | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        if (!inPackagingScope(p.id)) return false; // brand scope: only this brand's packaging
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (typeFilter !== "all" && p.packaging_type !== typeFilter) return false;
        return true;
      }),
    [items, search, typeFilter, inPackagingScope],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const typeLabel = (t: string) => PACKAGING_TYPE_LABELS[t as PackagingType] ?? t;

  return (
    <>
      <PageHeader
        title="Packaging"
        description="Master packaging items (Pizza Box, Sauce Cup…) with unit prices, used by recipes."
        actions={
          canManage && (
            <Button variant="accent" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Packaging
            </Button>
          )
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Search packaging…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="primary">Primary Packaging</SelectItem>
              <SelectItem value="secondary">Secondary Packaging</SelectItem>
              <SelectItem value="tertiary">Tertiary Packaging</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title="No packaging items yet"
            description="Add packaging items so recipes can reference them with automatic pricing."
            action={canManage && <Button variant="accent" onClick={openAdd}><Plus className="h-4 w-4" /> Add Packaging</Button>}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="w-28" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{typeLabel(p.packaging_type)}</TableCell>
                      <TableCell className="text-muted-foreground">{p.unit}</TableCell>
                      <TableCell className="text-right font-mono">{formatINR(p.unit_price)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "outline"}>{p.status}</Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(p); setFormOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={p.status === "active" ? "Deactivate" : "Activate"}
                              onClick={() => statusMut.mutate({ id: p.id, status: p.status === "active" ? "inactive" : "active" })}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => setDeleting(p)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <ul className="divide-y md:hidden">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{typeLabel(p.packaging_type)} · {p.unit}</p>
                    <p className="mt-1 font-mono text-sm">{formatINR(p.unit_price)}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => { setEditing(p); setFormOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive" onClick={() => setDeleting(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {canManage && <PackagingForm open={formOpen} onOpenChange={setFormOpen} item={editing} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="This permanently removes the packaging item. It's blocked if any recipe still uses it — deactivate instead."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await delMut.mutateAsync(deleting.id);
            toast.success("Packaging item deleted");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          } finally {
            setDeleting(null);
          }
        }}
      />
    </>
  );
}
