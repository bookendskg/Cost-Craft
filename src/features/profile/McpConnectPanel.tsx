// "Connect an AI assistant" — the setup details each person needs to point Claude
// (or any MCP client) at KostKraft as themselves.
//
// Everything shown here is already public in the browser bundle: the project URL
// and the anon key, which grant nothing on their own — the assistant still has to
// sign in as the user, and their role decides what it can do. No secret is exposed.

import { useState } from "react";
import { Bot, Check, Copy, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth/roleCache";
import { useSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const SERVER_PATH = "/absolute/path/to/recepie-costing/mcp/dist/kostkraft-mcp.mjs";

/** What each role's assistant may do — mirrors src/lib/auth/permissions.ts. */
function abilities(role: string): { can: string[]; cannot: string[] } {
  const read = "Read ingredients, recipes, yields and packaging";
  if (role === "super_admin") {
    return {
      can: [read, "Update prices and create ingredients, yields and imports", "Read the Activity Log and revert any change"],
      cannot: [],
    };
  }
  if (role === "admin" || role === "editor") {
    return {
      can: [read, "Update prices and create ingredients, yields and imports"],
      cannot: ["Read the Activity Log or revert changes (Super Admin only)"],
    };
  }
  return {
    can: [read],
    cannot: ["Change any data — your account is read-only", "Read the Activity Log or revert changes"],
  };
}

export function McpConnectPanel() {
  const user = useSession((s) => s.user)!;
  const url = import.meta.env.VITE_SUPABASE_URL ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
  const role = abilities(user.role);

  const loginCommand = `node ${SERVER_PATH} login`;
  const config = JSON.stringify(
    {
      mcpServers: {
        kostkraft: {
          command: "node",
          args: [SERVER_PATH, "serve"],
          env: { KOSTKRAFT_SUPABASE_URL: url, KOSTKRAFT_SUPABASE_ANON_KEY: anonKey },
        },
      },
    },
    null,
    2,
  );

  if (!isSupabaseConfigured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Connecting an assistant needs the live app. This copy is running on local demo data.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold">Connect an AI assistant</p>
          <Badge variant="outline">MCP</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Let Claude — or any assistant that speaks MCP — look things up and make changes in KostKraft
          for you. It signs in <strong>as you</strong>, so it can only do what you can, and every change
          it makes appears in the Activity Log under your name.
        </p>
      </Card>

      <Card className="p-6">
        <p className="mb-4 text-sm font-semibold">Setup — about two minutes, once per computer</p>
        <ol className="space-y-5">
          <Step n={1} title="Build the connector">
            <p className="mb-2 text-sm text-muted-foreground">
              In a terminal, inside the KostKraft project folder:
            </p>
            <CopyBlock label="Build" value={"npm install\nnpm run mcp:build"} />
          </Step>

          <Step n={2} title="Sign in">
            <p className="mb-2 text-sm text-muted-foreground">
              Use your KostKraft email ({user.email}) and password. Only a renewable session token is
              stored on your computer — never your password.
            </p>
            <CopyBlock label="Sign in" value={loginCommand} />
          </Step>

          <Step n={3} title="Add it to your assistant">
            <p className="mb-2 text-sm text-muted-foreground">
              Paste this into your MCP client's config — for Claude Desktop that's{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">claude_desktop_config.json</code> — replacing
              the path with where the project sits on your machine. Then restart the client and ask it
              “who am I in KostKraft?”.
            </p>
            <CopyBlock label="Config" value={config} />
          </Step>
        </ol>
      </Card>

      <Card className="p-6">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold">What your assistant will be allowed to do</p>
          <Badge variant="outline">{roleLabel(user.role)}</Badge>
        </div>
        <ul className="space-y-1.5 text-sm">
          {role.can.map((c) => (
            <li key={c} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{c}</span>
            </li>
          ))}
          {role.cannot.map((c) => (
            <li key={c} className="flex gap-2 text-muted-foreground">
              <span className="mt-0.5 w-4 shrink-0 text-center">—</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-xs text-muted-foreground">
          Bulk changes always show a preview first and need an explicit confirmation, so an assistant
          can't rewrite hundreds of rows from a loose instruction. If something does go wrong, a Super
          Admin can undo any change — or a whole import — from the Activity Log.
        </p>
      </Card>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-sm font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — select the text and copy manually.");
    }
  };
  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto rounded-md bg-muted/60 p-3 pr-12 text-xs leading-relaxed">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className={cn("absolute right-1.5 top-1.5 h-7 w-7", copied && "text-emerald-600")}
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
        title={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
