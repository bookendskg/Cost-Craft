import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, FileSpreadsheet, Download, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parseSpreadsheet, downloadTemplate, downloadFailedRows } from "@/lib/import/parseFile";
import type {
  ImportConfig,
  ImportMode,
  ImportPreview,
  ImportPreviewRow,
  ImportRowStatus,
  ImportSummary,
  ParsedRow,
} from "@/lib/import/importTypes";
import { toast } from "@/components/ui/use-toast";

const MODE_LABEL: Record<ImportMode, string> = {
  add: "Add new only",
  update: "Update matching",
  upsert: "Add & update",
};

const STATUS_LABEL: Record<ImportRowStatus, string> = {
  new: "New",
  update: "Update",
  unchanged: "No change",
  skip: "Skipped",
  error: "Error",
};

const STATUS_STYLE: Record<ImportRowStatus, string> = {
  new: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  update: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  unchanged: "bg-muted text-muted-foreground",
  skip: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
};

/**
 * Reusable CSV/XLSX import flow: upload → dry-run preview → approve or discard.
 * Nothing is written until the user approves, and a file with ANY invalid row is
 * blocked entirely — fix the file and upload it again.
 */
export function ImportDialog<T>({
  open,
  onOpenChange,
  config,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  config: ImportConfig<T>;
  onDone?: () => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "summary">("upload");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedRow<T>[]>([]);
  const [parseErrors, setParseErrors] = useState<ImportPreviewRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<ImportMode>("upsert");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modes = config.modes ?? ["upsert", "add", "update"];

  const reset = () => {
    setStep("upload");
    setFileName("");
    setParsed([]);
    setParseErrors([]);
    setPreview(null);
    setSummary(null);
    setBusy(false);
    setMode("upsert");
  };
  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  /** Dry run — recomputed whenever the file or the mode changes. */
  const runPreview = useCallback(
    async (rows: ParsedRow<T>[], m: ImportMode) => {
      setChecking(true);
      try {
        setPreview(await config.preview(m, rows));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not check the file.");
        setPreview(null);
      } finally {
        setChecking(false);
      }
    },
    [config],
  );

  useEffect(() => {
    if (step === "preview" && parsed.length) void runPreview(parsed, mode);
    // runPreview is stable per config; re-check on mode/file change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, parsed, step]);

  const onFile = async (file: File) => {
    try {
      const rows = await parseSpreadsheet(file);
      if (!rows.length) {
        toast.error("That file has no data rows.");
        return;
      }
      const ok: ParsedRow<T>[] = [];
      const bad: ImportPreviewRow[] = [];
      rows.forEach((r, i) => {
        const rowNo = i + 2; // +2: row 1 is the header
        const res = config.parseRow(r, rowNo);
        if ("value" in res) ok.push({ row: rowNo, value: res.value });
        else {
          bad.push({
            row: rowNo,
            status: "error",
            label: String(Object.values(r)[0] ?? ""),
            values: r as Record<string, string | number | null>,
            // parseRow messages already start with "Row N:" — don't say it twice.
            message: res.error.replace(new RegExp(`^Row ${rowNo}:\\s*`), ""),
          });
        }
      });
      setFileName(file.name);
      setParsed(ok);
      setParseErrors(bad);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const s = await config.run(mode, parsed.map((p) => p.value));
      setSummary(s);
      setStep("summary");
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  // Every row, in spreadsheet order: the parse failures merged with the dry run.
  const rows: ImportPreviewRow[] = [...parseErrors, ...(preview?.rows ?? [])].sort((a, b) => a.row - b.row);
  const errorCount = parseErrors.length + (preview?.counts.error ?? 0);
  const applyCount = (preview?.counts.new ?? 0) + (preview?.counts.update ?? 0);
  const blocked = errorCount > 0;
  const columns = rows.length ? Object.keys(rows.find((r) => r.status !== "error")?.values ?? rows[0].values).slice(0, 5) : [];

  const counts: [ImportRowStatus, number][] = preview
    ? ([
        ["new", preview.counts.new],
        ["update", preview.counts.update],
        ["unchanged", preview.counts.unchanged],
        ["skip", preview.counts.skip],
        ["error", errorCount],
      ] as [ImportRowStatus, number][]).filter(([, n]) => n > 0)
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      {/* dvh (not vh) so mobile browser chrome never clips the dialog; the calc()
          width keeps a gutter on phones instead of sitting edge-to-edge. */}
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          <DialogDescription>
            CSV or XLSX. Columns: {config.columns.map((c) => c.label + (c.required ? "*" : "")).join(", ")}.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Upload className="h-7 w-7" />
              <span className="text-sm">Click to choose a .csv or .xlsx file</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
                e.target.value = "";
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadTemplate(
                    `${config.title.replace(/\s+/g, "_")}_template.xlsx`,
                    config.columns,
                    config.sampleRows,
                  )
                }
              >
                <Download className="h-4 w-4" /> Download template
              </Button>
              <p className="text-xs text-muted-foreground">You'll see what changes before anything is saved.</p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" /> {fileName}
              {checking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              {counts.map(([status, n]) => (
                <span key={status} className={cn("rounded px-2 py-1 font-medium", STATUS_STYLE[status])}>
                  {n} {STATUS_LABEL[status].toLowerCase()}
                </span>
              ))}
              {preview?.groups?.map((g) => (
                <span key={g.label} className="rounded bg-muted px-2 py-1 text-muted-foreground">
                  {g.count} {g.label}
                </span>
              ))}
            </div>

            {blocked && (
              <div className="flex gap-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Nothing will be imported until the file is clean. Fix {errorCount}{" "}
                  {errorCount === 1 ? "row" : "rows"} below, then upload the file again.
                </p>
              </div>
            )}

            {preview?.warnings.map((w) => (
              <div key={w} className="flex gap-2 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{w}</p>
              </div>
            ))}

            {rows.length > 0 && (
              <div className="max-h-72 overflow-auto rounded border text-xs">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">Row</th>
                      <th className="px-2 py-1 text-left font-medium">Status</th>
                      {columns.map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                      ))}
                      <th className="px-2 py-1 text-left font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.row} className={cn("border-t", r.status === "error" && "bg-red-500/5")}>
                        <td className="px-2 py-1 text-muted-foreground">{r.row}</td>
                        <td className="px-2 py-1">
                          <span className={cn("rounded px-1.5 py-0.5 font-medium", STATUS_STYLE[r.status])}>
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        {columns.map((h) => (
                          <td key={h} className="px-2 py-1">{formatCell(r.values[h])}</td>
                        ))}
                        <td className="px-2 py-1 text-muted-foreground">{r.message ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {blocked && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadFailedRows(
                    "import_issues.xlsx",
                    rows.filter((r) => r.status === "error").map((r) => ({ row: r.row, message: r.message ?? "Invalid" })),
                  )
                }
              >
                <Download className="h-4 w-4" /> Download {errorCount} issue{errorCount === 1 ? "" : "s"}
              </Button>
            )}

            <div>
              <p className="mb-1.5 text-sm font-medium">Import mode</p>
              <div className="flex flex-wrap gap-2">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm transition-colors",
                      mode === m ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "summary" && summary && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" /> Import complete
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
              <Stat label="Total" value={summary.total} />
              <Stat label="Added" value={summary.imported} />
              <Stat label="Updated" value={summary.updated} />
              <Stat label="Skipped" value={summary.skipped} />
              <Stat label="Failed" value={summary.failed} bad />
            </div>
            {summary.errors.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => downloadFailedRows("import_errors.xlsx", summary.errors)}>
                <Download className="h-4 w-4" /> Download {summary.errors.length} failed rows
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "preview" ? (
            <>
              <Button variant="outline" onClick={close}>Discard</Button>
              <Button
                variant="accent"
                onClick={doImport}
                disabled={busy || checking || blocked || applyCount === 0}
                title={blocked ? "Fix the rows listed above first" : undefined}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {blocked ? "Fix errors to import" : `Import ${applyCount}`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={close}>{step === "summary" ? "Done" : "Cancel"}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function Stat({ label, value, bad }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="rounded-md bg-muted/50 p-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold", bad && value > 0 && "text-red-600 dark:text-red-400")}>{value}</p>
    </div>
  );
}
