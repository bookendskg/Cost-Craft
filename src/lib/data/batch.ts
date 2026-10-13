// A batch id ties every audit row written during one import or bulk action
// together, so the Activity Log can offer "revert all N changes" as one click.
// audit_logs.batch_id is a uuid column, so this must always be a real UUID —
// mock/db's uid() falls back to a non-uuid string on old runtimes.

export function newBatchId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // RFC 4122 v4 fallback.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
