import { formatDateTime } from "@/lib/utils";
import { AUDIT_ENTITY_LABELS, type AuditLog } from "@/lib/data/types";

type Row = AuditLog & { actor: string };

/** Export the visible activity-log page to a single-sheet .xlsx (lazy SheetJS). */
export async function exportActivityLog(entries: Row[]) {
  const XLSX = await import("xlsx");
  const rows = entries.map((e) => ({
    When: formatDateTime(e.performed_at),
    Who: e.actor,
    Role: e.actor_role ?? "",
    Email: e.actor_email ?? "",
    Action: e.action,
    Type: AUDIT_ENTITY_LABELS[e.entity_type] ?? e.entity_type,
    Details: e.notes ?? "",
    "Record Id": e.entity_id,
    Before: e.old_values ? JSON.stringify(e.old_values) : "",
    After: e.new_values ? JSON.stringify(e.new_values) : "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 26 }, { wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 38 }, { wch: 40 }, { wch: 40 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Activity Log");
  XLSX.writeFile(wb, `ActivityLog_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
