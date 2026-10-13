// Where the signed-in session lives on this machine.
//
// Only the refresh token is stored — never the password — in a file readable by
// the current user alone (0600), outside the repo. Signing out deletes it.

import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StoredSession {
  refreshToken: string;
}

const FILE =
  process.env.KOSTKRAFT_MCP_SESSION_FILE ?? join(homedir(), ".kostkraft", "mcp-session.json");

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    return parsed.refreshToken ? { refreshToken: parsed.refreshToken } : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: StoredSession): Promise<void> {
  await mkdir(dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
  await chmod(FILE, 0o600);
}

export async function clearSession(): Promise<void> {
  await rm(FILE, { force: true });
}

export const sessionFilePath = FILE;
