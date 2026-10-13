import type { ImportColumn, RawRow } from "./importTypes";

/** Parse the first sheet of a CSV/XLSX file into header-keyed row objects. */
export async function parseSpreadsheet(file: File): Promise<RawRow[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: "", raw: true });
}

/**
 * Download an .xlsx template: the configured columns in order (so an optional
 * column is never dropped just because the sample omits it) and one row per
 * example — recipe/prep templates need several rows to show that one recipe spans
 * one row per ingredient.
 */
export async function downloadTemplate(
  filename: string,
  columns: ImportColumn[],
  sampleRows: RawRow[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const headers = columns.map((c) => c.label);
  const rows = sampleRows.map((r) => Object.fromEntries(headers.map((h) => [h, r[h] ?? ""])));
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, filename);
}

/** Download the failed rows + reasons as .xlsx for the user to fix and re-import. */
export async function downloadFailedRows(
  filename: string,
  errors: { row: number; message: string }[],
): Promise<void> {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(errors.map((e) => ({ Row: e.row, Error: e.message })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Errors");
  XLSX.writeFile(wb, filename);
}
