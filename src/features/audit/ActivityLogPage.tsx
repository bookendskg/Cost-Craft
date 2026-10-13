// Activity Log — every recorded action (create/edit/delete, user & role changes,
// sign-ins, settings, exports, share links) with who did it and the before/after
// values. Super Admin only: the route guard and the audit_read RLS policy (0035)
// both restrict it.
import { useMemo, useState } from "react";
import { Download, RotateCcw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Pagination } from "@/components/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { cn, formatDateTime } from "@/lib/utils";
import { AUDIT_ENTITY_LABELS, type AuditAction, type AuditEntityType, type AuditLog } from "@/lib/data/types";
import { isRefusal, planRevert } from "@/lib/data/revertPlan";
import { ROLE_LABELS } from "@/lib/data/types";
import { useUsers } from "@/features/users/hooks";
import { useActivityLog, useRevertChange, useRevertedIds } from "./hooks";
import { exportActivityLog } from "./exportActivityLog";

const PAGE_SIZE = 50;

const ACTIONS: { value: AuditAction | "all"; label: string }[] = [
  { value: "all", label: "Any action" },
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "approve", label: "Approved" },
  { value: "reject", label: "Rejected" },
  { value: "submit", label: "Submitted" },
  { value: "archive", label: "Archived" },
  { value: "grant", label: "Shared" },
  { value: "revoke", label: "Revoked" },
  { value: "export", label: "Exported" },
  { value: "login", label: "Signed in" },
  { value: "logout", label: "Signed out" },
];

const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.value, a.label])) as Record<string, string>;

/** Colour by how destructive the action is. */
function actionTone(action: string): string {
  if (["delete", "reject", "revoke"].includes(action)) return "text-destructive";
  if (["create", "approve", "grant"].includes(action)) return "text-emerald-600";
  if (["login", "logout"].includes(action)) return "text-muted-foreground";
  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

export function ActivityLogPage() {
  const [entityType, setEntityType] = useState<AuditEntityType | "all">("all");
  const [action, setAction] = useState<AuditAction | "all">("all");
  const [userId, setUserId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  // A revert that hits a conflict comes back here, so the second press can force it.
  const [conflict, setConflict] = useState<string | null>(null);
  const revert = useRevertChange();

  const filter = { entityType, action, userId, search, from, to, page, pageSize: PAGE_SIZE };
  const { data, isLoading, error } = useActivityLog(filter);
  const { data: users = [] } = useUsers();
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const { data: revertedIds = [] } = useRevertedIds(rows.map((r) => r.id));
  const reverted = useMemo(() => new Set(revertedIds), [revertedIds]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  /** Actor name: the snapshot taken when the row was written, else the live user. */
  const actorOf = (r: AuditLog) => {
    const live = r.performed_by ? usersById.get(r.performed_by) : undefined;
    const name = r.actor_name || live?.name || (r.performed_by ? "Unknown user" : "System");
    const role = r.actor_role || live?.role;
    return { name, role: role ? ROLE_LABELS[role] ?? role : null };
  };

  const runRevert = async (entry: AuditLog, force = false) => {
    const batchId = entry.batch_id ?? undefined;
    const isSummary = entry.entity_id === "import" || entry.entity_id === "bulk";
    try {
      const result = await revert.mutateAsync({
        entryId: entry.id,
        batchId: isSummary ? batchId : undefined,
        force,
      });
      if (result.ok) {
        toast.success(result.message);
        setConflict(null);
        setDetail(null);
      } else if (result.conflict) {
        setConflict(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revert failed");
    }
  };

  const doExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportActivityLog(rows.map((r) => ({ ...r, actor: actorOf(r).name })));
      toast.success(`Exported ${rows.length} entries`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="Everything that happened in the system — who did it, when, and what changed."
        actions={
          <Button variant="outline" onClick={doExport} disabled={exporting || rows.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <Card className="mb-4 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search notes, people, ids…"
            value={search}
            onChange={(e) => reset(setSearch)(e.target.value)}
          />
          <Select value={entityType} onValueChange={reset((v) => setEntityType(v as AuditEntityType | "all"))}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {(Object.keys(AUDIT_ENTITY_LABELS) as AuditEntityType[]).map((k) => (
                <SelectItem key={k} value={k}>{AUDIT_ENTITY_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={reset((v) => setAction(v as AuditAction | "all"))}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userId} onValueChange={reset(setUserId)}>
            <SelectTrigger><SelectValue placeholder="Who" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : error ? (
          <EmptyState
            title="Couldn't load the activity log"
            description={error instanceof Error ? error.message : "Please try again."}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No activity found" description="Try widening the filters or date range." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead className="w-28">Action</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const actor = actorOf(r);
                  return (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setDetail(r)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(r.performed_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{actor.name}</div>
                        {actor.role && <div className="text-xs text-muted-foreground">{actor.role}</div>}
                      </TableCell>
                      <TableCell className={cn("font-medium", actionTone(r.action))}>
                        {ACTION_LABEL[r.action] ?? r.action}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {AUDIT_ENTITY_LABELS[r.entity_type] ?? r.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.notes || "—"}
                        {reverted.has(r.id) && (
                          <Badge variant="outline" className="ml-2 text-muted-foreground">Reverted</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t p-3">
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                label="entries"
              />
            </div>
          </>
        )}
      </Card>

      <Dialog
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) {
            setDetail(null);
            setConflict(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detail ? `${ACTION_LABEL[detail.action] ?? detail.action} — ${AUDIT_ENTITY_LABELS[detail.entity_type] ?? detail.entity_type}` : ""}
            </DialogTitle>
            <DialogDescription>
              {detail && `${actorOf(detail).name} · ${formatDateTime(detail.performed_at)}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              {detail.notes && <p>{detail.notes}</p>}
              <ChangeTable before={asRecord(detail.old_values)} after={asRecord(detail.new_values)} />
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <div>Record id: {detail.entity_id}</div>
                {detail.actor_email && <div>Actor: {detail.actor_email}</div>}
              </div>
              <RevertPanel
                entry={detail}
                reverted={reverted.has(detail.id)}
                conflict={conflict}
                busy={revert.isPending}
                onRevert={(force) => runRevert(detail, force)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Revert controls: what this would undo, any conflict, and the button itself. */
function RevertPanel({
  entry,
  reverted,
  conflict,
  busy,
  onRevert,
}: {
  entry: AuditLog;
  reverted: boolean;
  conflict: string | null;
  busy: boolean;
  onRevert: (force: boolean) => void;
}) {
  const isSummary = entry.entity_id === "import" || entry.entity_id === "bulk";
  const batch = isSummary && entry.batch_id;
  const decision = planRevert(entry);

  if (reverted) {
    return <p className="text-sm text-muted-foreground">This change has already been reverted.</p>;
  }
  if (!batch && isRefusal(decision)) {
    return <p className="text-sm text-muted-foreground">{decision.reason}</p>;
  }
  return (
    <div className="space-y-2 border-t pt-3">
      {conflict && (
        <div className="flex gap-2 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{conflict} Press again to revert anyway.</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {batch
            ? "Undoes every record changed by this import or bulk action."
            : "Puts this record back the way it was before this change."}
        </p>
        <Button
          variant={conflict ? "destructive" : "outline"}
          size="sm"
          disabled={busy}
          onClick={() => onRevert(!!conflict)}
        >
          <RotateCcw className="h-4 w-4" />
          {conflict ? "Revert anyway" : batch ? "Revert all changes" : "Revert this change"}
        </Button>
      </div>
    </div>
  );
}

/** Field-by-field before → after for whichever values the row captured. */
function ChangeTable({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  if (keys.length === 0) {
    return <p className="text-muted-foreground">No field-level values were recorded for this action.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Before</TableHead>
          <TableHead>After</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k}>
            <TableCell className="font-medium">{k}</TableCell>
            <TableCell className="text-muted-foreground">{show(before?.[k])}</TableCell>
            <TableCell>{show(after?.[k])}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
