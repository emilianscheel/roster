"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Code2, Loader2, Search, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EXAMPLES: {
  icon: LucideIcon;
  label: string;
  prompt: string;
}[] = [
  {
    icon: Search,
    label: "Find a founding infra engineer with Rust, Kubernetes, and recent OSS",
    prompt:
      "Find a founding infrastructure engineer with production Rust and Kubernetes experience, active open-source work within 60 days, startup experience, and signs they may be open to a new role.",
  },
  {
    icon: Users,
    label: "Shortlist three founding infra candidates with evidence before outreach",
    prompt:
      "Find three engineers who could become the founding infrastructure engineer at an agentic-AI startup: production Rust, Kubernetes, open-source activity within 60 days, startup experience, and a current transition signal.",
  },
  {
    icon: Code2,
    label: "Source platform engineers transitioning from SRE into infrastructure",
    prompt:
      "Source platform engineers transitioning from SRE into infrastructure roles. Prefer Kubernetes operators and Rust networking experience. Qualify cheaply before deep enrichment.",
  },
];

export function NewRoleInput() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(value?: string) {
    const text = (value ?? brief).trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    if (value) setBrief(value);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: text, start: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create role");
      }
      const data = (await res.json()) as { id: string };
      router.push(`/roles/${data.id}/live`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4">
      <div className="relative w-full rounded-2xl border border-border bg-background shadow-sm">
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Find a founding infrastructure engineer with production Rust and Kubernetes…"
          className="min-h-32 resize-none border-0 bg-transparent pb-12 pr-14 text-base shadow-none focus-visible:ring-0"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="absolute right-2 bottom-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full"
            disabled={busy || !brief.trim()}
            onClick={() => submit()}
            aria-label="Start"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col items-stretch gap-1 self-center pt-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            disabled={busy}
            onClick={() => void submit(ex.prompt)}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
          >
            <ex.icon className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="truncate text-sm text-muted-foreground transition-colors group-hover:text-foreground">
              {ex.label}
            </span>
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
