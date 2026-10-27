// "Connect an AI assistant" — everything a person needs to point Claude or ChatGPT
// at KostKraft as themselves.
//
// Two ways in, presented identically: a connector that runs on their own computer
// (paired with a one-time code) or the hosted server (reached with a personal
// token). Same tools either way; the difference is only where the code runs.
//
// Nothing secret is on display: the pairing code is single-use and short-lived, and
// a token is shown once and revocable here.

import { useEffect, useState } from "react";
import { Bot, Check, Copy, Globe, Laptop, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth/roleCache";
import { useSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { CODE_TTL_MINUTES, createPairingCode, setupPrompt } from "./mcpPairing";
import { createToken, hostedUrl, listTokens, revokeToken, type McpToken } from "./mcpTokens";

/** What each role's assistant may do — mirrors src/lib/auth/permissions.ts. */
function abilities(role: string): { can: string[]; cannot: string[] } {
  const read = "Read ingredients, recipes, yields, packaging and wastage";
  const catalogue = "Create and edit recipes, preps, yields and packaging, and record wastage";
  const materials = "Add raw materials, rename them, and change their prices, units and categories";
  const noDeletes = "Delete anything, or touch reports and approvals — those stay in the app";
  if (role === "super_admin") {
    return {
      can: [read, materials, catalogue, "Read the Activity Log and revert any change"],
      cannot: [noDeletes],
    };
  }
  if (role === "admin" || role === "editor") {
    return {
      can: [read, materials, catalogue],
      cannot: [noDeletes, "Read the Activity Log or revert changes (Super Admin only)"],
    };
  }
  if (role === "head_chef") {
    return {
      can: [read, catalogue],
      cannot: [
        "Change ingredient prices or rename raw materials (Admin or Editor only)",
        noDeletes,
        "Read the Activity Log or revert changes (Super Admin only)",
      ],
    };
  }
  return {
    can: [read],
    cannot: ["Change any data — your account is read-only", "Read the Activity Log or revert changes"],
  };
}

/** ChatGPT has nowhere to put a token, so it goes in the URL — see the warning below. */
const chatGptUrl = (url: string, token: string) => `${url}/${token}`;

/** The details a user pastes into their assistant's connector settings. */
function hostedInstructions(url: string, token: string): string {
  return [
    "ChatGPT → Settings → Plugins/Connectors → Add custom MCP server:",
    "",
    `  Server URL:      ${chatGptUrl(url, token)}`,
    "  Authentication:  No authentication",
    "",
    "Claude Code (keeps the token out of the URL):",
    `  claude mcp add --transport http kostkraft ${url} --header "Authorization: Bearer ${token}"`,
  ].join("\n");
}

export function McpConnectPanel() {
  const user = useSession((s) => s.user)!;
  const role = abilities(user.role);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const hosted = hostedUrl();

  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  const refreshTokens = async () => {
    try {
      setTokens(await listTokens(user.id));
    } catch {
      // The table may not exist yet; creating one reports the real reason.
    }
  };
  useEffect(() => {
    void refreshTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const generate = async () => {
    setGenerating(true);
    try {
      setPairing(await createPairingCode(user.id, "AI assistant"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create a code");
    } finally {
      setGenerating(false);
    }
  };

  const issue = async () => {
    setIssuing(true);
    try {
      setNewToken(await createToken(user.id, "Assistant"));
      await refreshTokens();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create a token");
    } finally {
      setIssuing(false);
    }
  };

  const revoke = async (id: string) => {
    try {
      await revokeToken(id);
      await refreshTokens();
      toast.success("Token revoked — that assistant is disconnected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    }
  };

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
          Let Claude or ChatGPT look things up and make changes in KostKraft for you. It signs in{" "}
          <strong>as you</strong>, so it can only do what you can, and every change it makes appears in
          the Activity Log under your name.
        </p>
      </Card>

      <Card className="p-6">
        <Tabs defaultValue="computer">
          <TabsList className="mb-4">
            <TabsTrigger value="computer">
              <Laptop className="mr-1.5 h-4 w-4" /> On my computer
            </TabsTrigger>
            <TabsTrigger value="online">
              <Globe className="mr-1.5 h-4 w-4" /> Online
            </TabsTrigger>
          </TabsList>

          {/* ── Local connector: Claude Code / Claude Desktop ─────────────── */}
          <TabsContent value="computer">
            <ConnectStep
              title="Claude Code or Claude Desktop"
              blurb={`Generate a setup code and paste the message below into Claude. It installs the connector and connects it for you. The code works once and expires in ${CODE_TTL_MINUTES} minutes — you never type your password into a terminal.`}
              action={
                <Button variant="accent" onClick={generate} disabled={generating}>
                  {generating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pairing ? "New setup code" : "Generate setup code"}
                </Button>
              }
            >
              {pairing && (
                <>
                  <Secret
                    value={pairing.code}
                    note={`Single use · expires ${new Date(pairing.expiresAt).toLocaleTimeString()}`}
                  />
                  <CopyBlock label="Setup message" value={setupPrompt(origin, pairing.code)} />
                </>
              )}
            </ConnectStep>
          </TabsContent>

          {/* ── Hosted server: ChatGPT (and Claude Code over HTTP) ────────── */}
          <TabsContent value="online">
            <ConnectStep
              title="ChatGPT, or Claude without a download"
              blurb="Create a personal token and paste the details below into your assistant's connector settings. Nothing is installed — your assistant talks to KostKraft directly. Revoke the token here whenever you like."
              action={
                <Button variant="accent" onClick={issue} disabled={issuing}>
                  {issuing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create connector token
                </Button>
              }
            >
              {newToken ? (
                <>
                  <Secret value={newToken} note="Copy it now — it won't be shown again" />
                  <CopyBlock label="Connector details" value={hostedInstructions(hosted, newToken)} />
                  <p className="max-w-3xl text-xs text-muted-foreground">
                    ChatGPT can't store a token separately, so for ChatGPT it sits in the URL — that
                    link <strong>is</strong> your password. Don't share it, and revoke it below if it
                    ever gets out. Claude Code uses the header form instead, which keeps it hidden.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setNewToken(null)}>
                    Done — hide it
                  </Button>
                </>
              ) : (
                hosted && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Server URL</p>
                    <CopyBlock label="Server URL" value={hosted} />
                  </div>
                )
              )}

              {tokens.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Your tokens</p>
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.name ?? "Assistant"}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(t.created_at).toLocaleDateString()} ·{" "}
                          {t.last_used_at
                            ? `last used ${new Date(t.last_used_at).toLocaleString()}`
                            : "never used"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revoke(t.id)}
                        aria-label={`Revoke ${t.name ?? "token"}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" /> Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ConnectStep>
          </TabsContent>
        </Tabs>
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

/** One connection route, so both tabs read the same way. */
function ConnectStep({
  title,
  blurb,
  action,
  children,
}: {
  title: string;
  blurb: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-sm font-semibold">{title}</p>
        <p className="max-w-3xl text-sm text-muted-foreground">{blurb}</p>
      </div>
      {action}
      {children}
    </div>
  );
}

/** A code or token: big, monospaced, with what to know about it. */
function Secret({ value, note }: { value: string; note: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="break-all rounded-md bg-muted px-3 py-1.5 text-base font-semibold tracking-wide">
        {value}
      </code>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
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
