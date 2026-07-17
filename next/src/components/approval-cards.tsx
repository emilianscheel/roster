"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  kind: string;
  status: string;
  payload: Record<string, unknown> | null;
  reformNotes: string | null;
  candidateId: string | null;
};

export function ApprovalCards({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [reformId, setReformId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(
    id: string,
    action: "allow" | "reject" | "reform",
    reformNotes?: string,
  ) {
    setBusy(id);
    await fetch("/api/approvals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, reformNotes }),
    });
    setBusy(null);
    setReformId(null);
    router.refresh();
  }

  const pending = tasks.filter((t) => t.status === "pending");

  if (!pending.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No pending tasks
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pending.map((task) => {
        const draft =
          typeof task.payload?.draft === "string" ? task.payload.draft : null;
        return (
          <div
            key={task.id}
            className="flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium">{task.title}</div>
                <div className="text-xs text-muted-foreground">{task.kind}</div>
              </div>
            </div>
            {draft ? (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                {draft}
              </pre>
            ) : null}
            {reformId === task.id ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reform notes"
                  className="min-h-20 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy === task.id}
                    onClick={() => act(task.id, "reform", notes)}
                  >
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReformId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={busy === task.id}
                  onClick={() => act(task.id, "allow")}
                >
                  <Check className="size-3.5" />
                  Allow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={busy === task.id}
                  onClick={() => act(task.id, "reject")}
                >
                  <X className="size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={() => {
                    setReformId(task.id);
                    setNotes("");
                  }}
                >
                  <Pencil className="size-3.5" />
                  Reform
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
