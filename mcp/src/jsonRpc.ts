// MCP over plain HTTP (stateless JSON-RPC) — what the hosted server speaks.
//
// The stdio server uses the official SDK; a Supabase Edge Function can't, because
// that transport is built on Node's http req/res. MCP's HTTP transport is just
// JSON-RPC 2.0 over POST, so this implements the handful of methods a client
// actually calls. The TOOLS registry is shared with stdio, so both transports
// expose identical capabilities.
//
// Compliance is pinned by mcp/src/jsonRpc.test.ts, which drives this with the same
// request shapes the official SDK client sends.

import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { TOOLS, type ToolResult } from "./tools.js";

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_INFO = { name: "kostkraft", version: "0.1.0" };

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const ok = (id: string | number | null, result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });
const err = (id: string | number | null, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

/** JSON Schema for a tool's arguments, as tools/list must advertise them. */
function inputSchemaOf(tool: (typeof TOOLS)[number]): Record<string, unknown> {
  const schema = zodToJsonSchema(z.object(tool.inputSchema), { target: "jsonSchema7" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no reply), which
 * the caller should answer with 202 Accepted.
 */
export async function handleJsonRpc(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const id = request.id ?? null;

  switch (request.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    // Notifications carry no id and get no response.
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, {
        tools: TOOLS.map((t) => ({
          name: t.name,
          title: t.title,
          description: t.description,
          inputSchema: inputSchemaOf(t),
        })),
      });

    case "tools/call": {
      const name = request.params?.name as string | undefined;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return err(id, -32602, `Unknown tool: ${name ?? "(none)"}`);
      const parsed = z.object(tool.inputSchema).safeParse(request.params?.arguments ?? {});
      if (!parsed.success) {
        return err(id, -32602, `Invalid arguments for ${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      }
      try {
        const result = (await tool.handler(parsed.data as never)) as ToolResult;
        return ok(id, { content: result.content, isError: result.isError ?? false });
      } catch (e) {
        // Tool failures are reported IN the result (per MCP), not as protocol errors,
        // so the model can read the message and try something else.
        return ok(id, {
          content: [{ type: "text", text: e instanceof Error ? e.message : "Tool failed" }],
          isError: true,
        });
      }
    }

    default:
      return err(id, -32601, `Method not found: ${request.method}`);
  }
}
