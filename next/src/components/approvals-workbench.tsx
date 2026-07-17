"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Focus, Pencil, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RemindLaterMenu } from "@/components/remind-later-menu";
import type { ApprovalTaskView } from "@/lib/approvals";

const KIND_TABS = [
  { value: "all", label: "All", kind: null as string | null },
  { value: "send_outreach", label: "Outreach", kind: "send_outreach" },
  { value: "unlock_contact", label: "Unlock", kind: "unlock_contact" },
  { value: "start_followup", label: "Follow-up", kind: "start_followup" },
  { value: "place_call", label: "Call", kind: "place_call" },
  { value: "budget_exceed", label: "Budget", kind: "budget_exceed" },
] as const;

export type ApprovalAction = "allow" | "reject" | "reform" | "remind";

export async function patchApproval(input: {
  id: string;
  action: ApprovalAction;
  reformNotes?: string;
  remindAt?: string;
}) {
  const res = await fetch("/api/approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Approval action failed");
  }
  return res.json();
}

export function isActivePending(task: ApprovalTaskView) {
  if (task.status !== "pending") return false;
  if (!task.remindAt) return true;
  return new Date(task.remindAt).getTime() <= Date.now();
}

export function ApprovalCard({
  task,
  busy,
  reformId,
  notes,
  onNotesChange,
  onStartReform,
  onCancelReform,
  onAct,
  onRemind,
  showSkip,
  onSkip,
  expanded,
}: {
  task: ApprovalTaskView;
  busy: boolean;
  reformId: string | null;
  notes: string;
  onNotesChange: (value: string) => void;
  onStartReform: () => void;
  onCancelReform: () => void;
  onAct: (action: "allow" | "reject" | "reform", reformNotes?: string) => void;
  onRemind: (remindAt: Date) => void;
  showSkip?: boolean;
  onSkip?: () => void;
  expanded?: boolean;
}) {
  const draft =
    typeof task.payload?.draft === "string" ? task.payload.draft : null;
  const isOutreach = task.kind === "send_outreach";

  return (
    <div
      className={`flex min-h-56 flex-col gap-3 rounded-lg border border-border p-4 ${
        expanded ? "min-h-80" : ""
      }`}
    >
      <div className="space-y-1">
        <div className="font-medium">{task.title}</div>
        {isOutreach ? (
          <div className="text-xs text-muted-foreground">
            {task.recipientEmail ?? "No email on file"}
          </div>
        ) : null}
      </div>

      {draft ? (
        <pre
          className={`overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs ${
            expanded ? "max-h-80 flex-1" : "max-h-40"
          }`}
        >
          {draft}
        </pre>
      ) : (
        <div className="flex-1" />
      )}

      {reformId === task.id ? (
        <div className="mt-auto flex flex-col gap-2">
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Reform notes"
            className="min-h-20 text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => onAct("reform", notes)}
            >
              Submit
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReform}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1"
            disabled={busy}
            onClick={() => onAct("allow")}
          >
            <Check className="size-3.5" />
            Allow
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={busy}
            onClick={() => onAct("reject")}
          >
            <X className="size-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            disabled={busy}
            onClick={onStartReform}
          >
            <Pencil className="size-3.5" />
            Reform
          </Button>
          {showSkip && onSkip ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onSkip}
            >
              Skip
            </Button>
          ) : null}
          <RemindLaterMenu disabled={busy} onRemind={onRemind} />
        </div>
      )}
    </div>
  );
}

export function ApprovalsWorkbench({ tasks }: { tasks: ApprovalTaskView[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kindTab, setKindTab] = useState("all");
  const [reformId, setReformId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const pending = useMemo(
    () => tasks.filter(isActivePending),
    [tasks],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const kind =
      KIND_TABS.find((t) => t.value === kindTab)?.kind ?? null;

    return pending.filter((task) => {
      if (kind && task.kind !== kind) return false;
      if (!q) return true;
      const draft =
        typeof task.payload?.draft === "string" ? task.payload.draft : "";
      const haystack = [
        task.title,
        draft,
        task.recipientEmail ?? "",
        task.candidateName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [pending, query, kindTab]);

  async function act(
    id: string,
    action: "allow" | "reject" | "reform",
    reformNotes?: string,
  ) {
    setBusy(id);
    try {
      await patchApproval({ id, action, reformNotes });
      setReformId(null);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remind(id: string, remindAt: Date) {
    setBusy(id);
    try {
      await patchApproval({
        id,
        action: "remind",
        remindAt: remindAt.toISOString(),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold">Approvals</h1>
        <Button
          nativeButton={false}
          render={<Link href="/approvals/focus" />}
          className="gap-1.5 self-start sm:self-auto"
        >
          <Focus className="size-4" />
          Let&apos;s focus
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search approvals…"
            className="pl-8"
          />
        </div>
        <Tabs
          value={kindTab}
          onValueChange={setKindTab}
          className="shrink-0"
        >
          <TabsList className="max-w-full overflow-x-auto">
            {KIND_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!filtered.length ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No pending tasks
        </div>
      ) : (
        <div className="grid items-stretch gap-3 md:grid-cols-2">
          {filtered.map((task) => (
            <ApprovalCard
              key={task.id}
              task={task}
              busy={busy === task.id}
              reformId={reformId}
              notes={notes}
              onNotesChange={setNotes}
              onStartReform={() => {
                setReformId(task.id);
                setNotes("");
              }}
              onCancelReform={() => setReformId(null)}
              onAct={(action, reformNotes) =>
                act(task.id, action, reformNotes)
              }
              onRemind={(remindAt) => remind(task.id, remindAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
