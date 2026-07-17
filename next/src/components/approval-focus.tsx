"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ApprovalCard,
  isActivePending,
  patchApproval,
} from "@/components/approvals-workbench";
import type { ApprovalTaskView } from "@/lib/approvals";

export function ApprovalFocus({ tasks }: { tasks: ApprovalTaskView[] }) {
  const router = useRouter();
  const pending = useMemo(() => tasks.filter(isActivePending), [tasks]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [reformId, setReformId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const queue = useMemo(
    () => pending.filter((t) => !skippedIds.has(t.id)),
    [pending, skippedIds],
  );

  const current = queue[0] ?? null;
  const remaining = queue.length;

  async function act(
    action: "allow" | "reject" | "reform",
    reformNotes?: string,
  ) {
    if (!current) return;
    setBusy(true);
    try {
      await patchApproval({ id: current.id, action, reformNotes });
      setReformId(null);
      setNotes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remind(remindAt: Date) {
    if (!current) return;
    setBusy(true);
    try {
      await patchApproval({
        id: current.id,
        action: "remind",
        remindAt: remindAt.toISOString(),
      });
      setReformId(null);
      setNotes("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    if (!current) return;
    setSkippedIds((prev) => new Set(prev).add(current.id));
    setReformId(null);
    setNotes("");
  }

  if (!current) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-lg font-semibold">You&apos;re all caught up</h1>
        <p className="text-sm text-muted-foreground">
          No more approvals in this focus session.
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/approvals" />}
          className="gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back to approvals
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="gap-1.5"
          render={<Link href="/approvals" />}
        >
          <ArrowLeft className="size-3.5" />
          Approvals
        </Button>
        <div className="text-xs text-muted-foreground">
          {remaining} left
        </div>
      </div>

      <ApprovalCard
        task={current}
        busy={busy}
        reformId={reformId}
        notes={notes}
        onNotesChange={setNotes}
        onStartReform={() => {
          setReformId(current.id);
          setNotes("");
        }}
        onCancelReform={() => setReformId(null)}
        onAct={act}
        onRemind={remind}
        showSkip
        onSkip={skip}
        expanded
      />
    </div>
  );
}
