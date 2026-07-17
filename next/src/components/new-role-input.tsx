"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";

export function NewRoleInput() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, start: true }),
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
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4">
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
            onClick={submit}
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
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
