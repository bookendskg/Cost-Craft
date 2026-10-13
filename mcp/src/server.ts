// KostKraft MCP server over stdio — what Claude Code / Claude Desktop launch.
//
// The tools themselves live in tools.ts, shared with the hosted HTTP server, so
// both transports expose exactly the same capabilities and the same safety rules.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { usersRepo } from "@/lib/data";
import { restoreSession } from "./supabaseClient.js";
import { setActor, TOOLS } from "./tools.js";

const VERSION = "0.1.0";

/** The catalogue, for `kostkraft-mcp tools` — no sign-in, so no data access. */
export const toolRegistry = TOOLS.map((t) => ({
  name: t.name,
  title: t.title,
  description: t.description,
}));

export function createServer(): McpServer {
  const server = new McpServer({ name: "kostkraft", version: VERSION });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { title: tool.title, description: tool.description, inputSchema: tool.inputSchema },
      // The shared handler returns MCP content already; the SDK's generic signature
      // can't see that through ToolDef, hence the cast.
      ((args: Record<string, unknown>) => tool.handler(args as never)) as never,
    );
  }
  return server;
}

export async function buildServer(): Promise<McpServer> {
  const session = await restoreSession();
  const profile = await usersRepo.getById(session.userId);
  if (!profile) throw new Error("Your KostKraft profile was not found. Ask an admin to approve your account.");
  if (profile.status === "inactive") throw new Error("Your KostKraft account is deactivated.");
  setActor({ userId: session.userId, email: session.email, name: profile.name, role: profile.role });
  return createServer();
}

export async function main(): Promise<void> {
  const server = await buildServer();
  await server.connect(new StdioServerTransport());
}
