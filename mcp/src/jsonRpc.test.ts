// The hosted server implements MCP's HTTP transport by hand (a Supabase Edge
// Function can't run the SDK's Node-based transport), so these tests pin the wire
// protocol: the exact request shapes a client sends, and the replies it expects.
import { describe, it, expect } from "vitest";
import { handleJsonRpc, PROTOCOL_VERSION } from "./jsonRpc";
import { TOOLS } from "./tools";

const call = (method: string, params?: Record<string, unknown>, id: string | number | null = 1) =>
  handleJsonRpc({ jsonrpc: "2.0", id, method, params });

describe("MCP over HTTP — handshake", () => {
  it("answers initialize with a protocol version and tool capability", async () => {
    const res = await call("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(res).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: { protocolVersion: PROTOCOL_VERSION, serverInfo: { name: "kostkraft" } },
    });
    expect((res!.result as { capabilities: unknown }).capabilities).toMatchObject({ tools: {} });
  });

  it("stays silent on notifications (they carry no id)", async () => {
    expect(await handleJsonRpc({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("answers ping", async () => {
    expect(await call("ping")).toMatchObject({ result: {} });
  });

  it("reports unknown methods as JSON-RPC errors", async () => {
    expect(await call("resources/list")).toMatchObject({ error: { code: -32601 } });
  });
});

describe("MCP over HTTP — tools/list", () => {
  it("advertises every shared tool with a JSON Schema", async () => {
    const res = await call("tools/list");
    const tools = (res!.result as { tools: { name: string; description: string; inputSchema: Record<string, unknown> }[] }).tools;
    expect(tools).toHaveLength(TOOLS.length);
    expect(tools.map((t) => t.name)).toEqual(TOOLS.map((t) => t.name));
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema).not.toHaveProperty("$schema");
    }
  });

  it("marks the arguments a tool actually requires", async () => {
    const res = await call("tools/list");
    const tools = (res!.result as { name: string; inputSchema: { required?: string[] } }[] | { tools: { name: string; inputSchema: { required?: string[] } }[] });
    const list = (tools as { tools: { name: string; inputSchema: { required?: string[] } }[] }).tools;
    const update = list.find((t) => t.name === "update_ingredient_price")!;
    expect(update.inputSchema.required).toEqual(expect.arrayContaining(["ingredient", "price"]));
    // Bulk writes must demand an explicit confirmation.
    const apply = list.find((t) => t.name === "apply_ingredient_import")!;
    expect(apply.inputSchema.required).toContain("confirm");
  });
});

describe("MCP over HTTP — tools/call", () => {
  it("rejects an unknown tool", async () => {
    expect(await call("tools/call", { name: "drop_everything", arguments: {} })).toMatchObject({
      error: { code: -32602 },
    });
  });

  it("validates arguments against the tool's schema", async () => {
    const res = await call("tools/call", { name: "update_ingredient_price", arguments: { ingredient: "Onion" } });
    expect(res).toMatchObject({ error: { code: -32602 } });
    expect((res!.error as { message: string }).message).toMatch(/price/);
  });

  it("runs a tool and returns its content", async () => {
    // Tests run against the mock data layer, so this exercises the whole path.
    const res = await call("tools/call", { name: "list_ingredients", arguments: { limit: 3 } });
    expect(res!.error).toBeUndefined();
    const result = res!.result as { content: { type: string; text: string }[]; isError: boolean };
    expect(result.isError).toBe(false);
    expect(JSON.parse(result.content[0].text)).toHaveProperty("ingredients");
  });

  it("returns a tool's own failure as content, not a protocol error, so the model can react", async () => {
    const res = await call("tools/call", { name: "get_ingredient", arguments: { ingredient: "no such thing" } });
    expect(res!.error).toBeUndefined();
    expect(res!.result).toMatchObject({ isError: true });
  });
});
