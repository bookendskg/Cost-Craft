// Protocol smoke test: connects a real MCP client to the server over an in-memory
// transport and lists the tools. No sign-in, so it never touches live data.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createServer();
await server.connect(serverTransport);

const client = new Client({ name: "smoke", version: "0" });
await client.connect(clientTransport);

const { tools } = await client.listTools();
console.log(`tools/list returned ${tools.length} tools`);
for (const t of tools) {
  const required = (t.inputSchema as { required?: string[] }).required ?? [];
  console.log(`  ${t.name} — required: [${required.join(", ")}]`);
}
await client.close();
await server.close();
