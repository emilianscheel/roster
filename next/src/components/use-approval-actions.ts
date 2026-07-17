"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalTaskView } from "@/lib/approvals";

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

export function useApprovalActions() {
  const router = useRouter();
  const [reformId, setReformId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(
    id: string,
    action: Exclude<ApprovalAction, "remind">,
    reformNotes?: string,
  ) {
    setBusy(id);
    try {
      await patchApproval({ id, action, reformNotes });
      setReformId(null);
      setNotes("");
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
      setReformId(null);
      setNotes("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function startReform(id: string) {
    setReformId(id);
    setNotes("");
  }

  function cancelReform() {
    setReformId(null);
  }

  return {
    busy,
    reformId,
    notes,
    setNotes,
    act,
    remind,
    startReform,
    cancelReform,
  };
}
