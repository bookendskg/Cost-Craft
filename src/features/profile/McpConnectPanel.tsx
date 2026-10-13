// "Connect an AI assistant" — the setup details each person needs to point Claude
// (or any MCP client) at KostKraft as themselves.
//
// Everything shown here is already public in the browser bundle: the project URL
// and the anon key, which grant nothing on their own — the assistant still has to
// sign in as the user, and their role decides what it can do. No secret is exposed.

import { useEffect, useState } from "react";
import { Bot, Check, Copy, Globe, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/auth/roleCache";
import { useSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { CODE_TTL_MINUTES, createPairingCode, setupPrompt } from "./mcpPairing";
import { createToken, hostedUrl, listTokens, revokeToken, type McpToken } from "./mcpTokens";

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
  const role = abilities(user.role);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const [tokens, setTokens] = useState<McpToken[]>([]);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const hosted = hostedUrl();

  const refreshTokens = async () => {
    try {
      setTokens(await listTokens(user.id));
    } catch {
      // The table may not exist yet; issuing one reports the real reason.
    }
  };
  useEffect(() => {
    void refreshTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const issue = async () => {
    setIssuing(true);
    try {
      setNewToken(await createToken(user.id, "ChatGPT"));
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
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold">Connect in one step</p>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Generate a setup code, paste the block below into Claude (or any assistant that can run
          commands), and it installs and connects the connector for you. The code works once and
          expires in {CODE_TTL_MINUTES} minutes — you never type your password into a terminal.
        </p>

        {!pairing ? (
          <Button variant="accent" onClick={generate} disabled={generating}>
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate setup code
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-md bg-muted px-3 py-1.5 text-base font-semibold tracking-widest">
                {pairing.code}
              </code>
              <span className="text-xs text-muted-foreground">
                Single use · expires {new Date(pairing.expiresAt).toLocaleTimeString()}
              </span>
              <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>
                New code
              </Button>
            </div>
            <CopyBlock label="Setup message" value={setupPrompt(origin, pairing.code)} />
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-2 flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm font-semibold">ChatGPT and other online assistants</p>
        </div>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          ChatGPT can't run the connector on your computer — it can only reach a web address. Create a
          personal token and add this server in your assistant's connector settings. It still acts as
          you, with your permissions, and you can revoke it here at any time.
        </p>

        {hosted && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Server URL</p>
            <CopyBlock label="Server URL" value={hosted} />
          </div>
        )}

        {newToken ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Your token — copy it now, it won't be shown again
            </p>
            <CopyBlock label="Token" value={newToken} />
            <p className="text-xs text-muted-foreground">
              In ChatGPT, add a connector with the URL above and this token as the authentication /
              Bearer token.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setNewToken(null)}>
              Done — hide it
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={issue} disabled={issuing}>
            {issuing && <Loader2 className="h-4 w-4 animate-spin" />}
            Create connector token
          </Button>
        )}

        {tokens.length > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Your tokens</p>
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.name ?? "Assistant"}</p>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(t.created_at).toLocaleDateString()} ·{" "}
                    {t.last_used_at ? `last used ${new Date(t.last_used_at).toLocaleString()}` : "never used"}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revoke(t.id)} aria-label={`Revoke ${t.name ?? "token"}`}>
                  <Trash2 className="h-4 w-4 text-destructive" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        )}
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
