"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";

export function LiveRunPanel({
  roleId,
  initialSteps = [],
}: {
  roleId: string;
  initialSteps?: string[];
}) {
  const [steps, setSteps] = useState<string[]>(initialSteps);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  async function rerun() {
    setBusy(true);
    const res = await fetch("/api/agent/recruiting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId, demo: true }),
    });
    const data = await res.json();
    setSteps(data.steps || []);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Live</h1>
        <Button size="sm" variant="outline" onClick={rerun} disabled={busy} className="gap-1">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
          Run
        </Button>
      </div>
      <div className="space-y-2 font-mono text-sm">
        {steps.length === 0 ? (
          <p className="text-muted-foreground">No activity yet</p>
        ) : (
          steps.map((s, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground">✓</span>
              <span>{s}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
