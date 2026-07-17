"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToDollars } from "@/lib/spend/metrics";

type BudgetSettingsProps = {
  roleId: string;
  budgetCents: number;
  maxPerCandidateCents: number;
  maxToolCallCents: number;
};

function dollarsInputValue(cents: number): string {
  return centsToDollars(cents).toFixed(2);
}

function parseDollarsToCents(raw: string): number | null {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function BudgetSettings({
  roleId,
  budgetCents,
  maxPerCandidateCents,
  maxToolCallCents,
}: BudgetSettingsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [budget, setBudget] = useState(dollarsInputValue(budgetCents));
  const [maxPer, setMaxPer] = useState(
    dollarsInputValue(maxPerCandidateCents),
  );
  const [maxTool, setMaxTool] = useState(dollarsInputValue(maxToolCallCents));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSave() {
    setError(null);
    setSaved(false);
    const nextBudget = parseDollarsToCents(budget);
    const nextMaxPer = parseDollarsToCents(maxPer);
    const nextMaxTool = parseDollarsToCents(maxTool);
    if (
      nextBudget === null ||
      nextMaxPer === null ||
      nextMaxTool === null
    ) {
      setError("Enter valid dollar amounts (≥ 0).");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/roles/${roleId}/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetCents: nextBudget,
          maxPerCandidateCents: nextMaxPer,
          maxToolCallCents: nextMaxTool,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Failed to save budget");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="text-sm font-medium">Budget limits</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Role budget ($)
          <Input
            type="number"
            min={0}
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="h-8"
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Max / candidate ($)
          <Input
            type="number"
            min={0}
            step="0.01"
            value={maxPer}
            onChange={(e) => setMaxPer(e.target.value)}
            className="h-8"
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Max / tool call ($)
          <Input
            type="number"
            min={0}
            step="0.01"
            value={maxTool}
            onChange={(e) => setMaxTool(e.target.value)}
            className="h-8"
          />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save limits"}
        </Button>
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : null}
        {saved && !error ? (
          <span className="text-xs text-muted-foreground">Saved</span>
        ) : null}
      </div>
    </div>
  );
}
