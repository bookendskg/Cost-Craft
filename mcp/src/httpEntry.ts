// Entry point bundled into the hosted Edge Function (scripts/build-mcp-http.mjs).
// Exposes the shared tool layer plus the hooks the function needs per request.

export { handleJsonRpc, PROTOCOL_VERSION, SERVER_INFO } from "./jsonRpc.js";
export type { JsonRpcRequest, JsonRpcResponse } from "./jsonRpc.js";
export { setActor, TOOLS } from "./tools.js";
export type { Actor } from "./tools.js";
export { makeUserClient, setRequestClient } from "./supabaseServerClient.js";
