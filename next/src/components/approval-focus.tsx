"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApprovalCard } from "@/components/approvals-workbench";
import {
  isActivePending,
  useApprovalActions,
} from "@/components/use-approval-actions";
import type { ApprovalTaskView } from "@/lib/approvals";

export function ApprovalFocus({ tasks }: { tasks: ApprovalTaskView[] }) {
  const pending = useMemo(() => tasks.filter(isActivePending), [tasks]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const {
    busy,
    reformId,
    notes,
    setNotes,
    act,
    remind,
    startReform,
    cancelReform,
  } = useApprovalActions();

  const queue = useMemo(
    () => pending.filter((t) => !skippedIds.has(t.id)),
    [pending, skippedIds],
  );

  const current = queue[0] ?? null;
  const remaining = queue.length;

  function skip() {
    if (!current) return;
    setSkippedIds((prev) => new Set(prev).add(current.id));
    cancelReform();
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
        busy={busy === current.id}
        reformId={reformId}
        notes={notes}
        onNotesChange={setNotes}
        onStartReform={() => startReform(current.id)}
        onCancelReform={cancelReform}
        onAct={(action, reformNotes) => act(current.id, action, reformNotes)}
        onRemind={(remindAt) => remind(current.id, remindAt)}
        expanded
      />

      <div className="flex justify-center">
        <Button
          size="sm"
          variant="ghost"
          disabled={busy === current.id}
          onClick={skip}
        >
          Skip
        </Button>
      </div>
    </div>
  );
}
