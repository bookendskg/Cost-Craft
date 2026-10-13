// Shared types for the reusable CSV/XLSX import workflow (§35–§37). One
// ImportConfig drives the dialog for any data page that has an Export.

export type ImportMode = "add" | "update" | "upsert";

export interface ImportSummary {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export interface ImportColumn {
  /** Header label shown in the template + matched against the file (case-insensitive). */
  label: string;
  required?: boolean;
}

export type RawRow = Record<string, unknown>;

/** A parsed record together with the spreadsheet row it came from. */
export interface ParsedRow<T> {
  row: number;
  value: T;
}

/** What a single file row will do when imported. */
export type ImportRowStatus = "new" | "update" | "unchanged" | "skip" | "error";

export interface ImportPreviewRow {
  /** Spreadsheet row number (the header is row 1). */
  row: number;
  status: ImportRowStatus;
  /** What the row refers to — "Onion", "Tomato Sauce → Tomato". */
  label: string;
  /** The values as the system read them, for the preview table. */
  values: Record<string, string | number | null>;
  /** Why it errored, or why it will be skipped. */
  message?: string;
}

/** The full dry-run: nothing is written until the user approves it. */
export interface ImportPreview {
  rows: ImportPreviewRow[];
  counts: Record<ImportRowStatus, number>;
  /** Entity roll-up for multi-row types — "3 preps", "14 ingredient lines". */
  groups?: { label: string; count: number }[];
  /** Non-blocking notices, e.g. ingredients that will be created without a price. */
  warnings: string[];
}

export const emptyCounts = (): Record<ImportRowStatus, number> => ({
  new: 0,
  update: 0,
  unchanged: 0,
  skip: 0,
  error: 0,
});

export interface ImportConfig<T> {
  title: string;
  /** Expected columns — drives the template + the preview header hint. */
  columns: ImportColumn[];
  /** Validate + map one raw row to a typed record (rowNumber is 1-based incl. header). */
  parseRow: (row: RawRow, rowNumber: number) => { value: T } | { error: string };
  /**
   * Dry run: what WOULD happen, checked against current data. Called before the
   * user approves the import; must not write anything.
   */
  preview: (mode: ImportMode, rows: ParsedRow<T>[]) => Promise<ImportPreview>;
  /** Persist the records in the chosen mode; returns a summary. */
  run: (mode: ImportMode, rows: T[]) => Promise<ImportSummary>;
  /** Representative sample rows for the downloadable template (first one is also
   *  the single-row example shown on the Import Data cards). */
  sampleRows: RawRow[];
  /** Which modes are offered (default all three). */
  modes?: ImportMode[];
}

/** Read a field from a raw row by any of its accepted header spellings. */
export function pick(row: RawRow, labels: string[]): unknown {
  const keys = Object.keys(row);
  for (const label of labels) {
    const k = keys.find((kk) => kk.trim().toLowerCase() === label.trim().toLowerCase());
    if (k != null && row[k] !== "" && row[k] != null) return row[k];
  }
  return undefined;
}

/** Parse a spreadsheet cell to a number; "" → null, garbage → NaN. */
export function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isFinite(n) ? n : NaN;
}

export function toText(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
