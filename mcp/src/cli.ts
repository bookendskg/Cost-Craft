#!/usr/bin/env node
// kostkraft-mcp — `login` once, then your AI client runs `serve` for you.
//
//   kostkraft-mcp login     sign in with your KostKraft email + password
//   kostkraft-mcp whoami    show who this machine is signed in as
//   kostkraft-mcp logout    forget the stored session
//   kostkraft-mcp serve     speak MCP over stdio (what the AI client runs)

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { clearSession, loadSession, saveSession, sessionFilePath } from "./credentials.js";
import { requireClient } from "./supabaseClient.js";
import { main as serve, createServer, toolRegistry } from "./server.js";

async function prompt(question: string, { mask = false } = {}): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true });
  if (!mask) {
    const answer = await rl.question(question);
    rl.close();
    return answer.trim();
  }
  // Hide the password while it's typed.
  const answer = await new Promise<string>((resolve) => {
    stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    const onData = (chunk: Buffer) => {
      const char = chunk.toString("utf8");
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      } else if (char === "\u007f") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
  rl.close();
  return answer.trim();
}

async function login(): Promise<void> {
  const client = requireClient();
  const email = await prompt("KostKraft email: ");
  const password = await prompt("Password: ", { mask: true });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    console.error(`Sign-in failed: ${error?.message ?? "no session returned"}`);
    process.exit(1);
  }
  await saveSession({ refreshToken: data.session.refresh_token });
  // Mirrors the app's sign-in routine (stamps last_login, logs the sign-in).
  await client.rpc("on_sign_in");
  console.log(`Signed in as ${data.session.user.email}.`);
  console.log(`Session stored at ${sessionFilePath} (readable only by you).`);
}

async function whoami(): Promise<void> {
  const stored = await loadSession();
  if (!stored) {
    console.log("Not signed in. Run `kostkraft-mcp login`.");
    return;
  }
  const client = requireClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: stored.refreshToken });
  if (error || !data.session) {
    console.log("Stored session has expired. Run `kostkraft-mcp login` again.");
    return;
  }
  await saveSession({ refreshToken: data.session.refresh_token });
  console.log(`Signed in as ${data.session.user.email}.`);
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? "serve";
  switch (command) {
    case "login":
      await login();
      break;
    case "logout":
      await clearSession();
      console.log("Signed out — the stored session was deleted.");
      break;
    case "whoami":
      await whoami();
      break;
    case "serve":
      await serve();
      break;
    case "tools": {
      createServer(); // registers the catalogue; no sign-in, so no data access
      console.log(`kostkraft-mcp exposes ${toolRegistry.length} tools:\n`);
      for (const t of toolRegistry) console.log(`  ${t.name.padEnd(26)} ${t.title}`);
      break;
    }
    default:
      console.error(`Unknown command "${command}". Use login, logout, whoami, tools or serve.`);
      process.exit(1);
  }
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
