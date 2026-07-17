"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

export type ToolActionStatus = "running" | "done" | "needs_approval" | "error";

type ToolActionCardProps = {
  name: string;
  status: ToolActionStatus;
  summary?: string;
  detail?: string;
};

function humanizeToolName(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function statusBadge(status: ToolActionStatus) {
  switch (status) {
    case "running":
      return (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="size-3 animate-spin" />
          Running
        </Badge>
      );
    case "needs_approval":
      return (
        <Badge variant="outline" className="gap-1">
          <ShieldAlert className="size-3" />
          Needs approval
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="size-3" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3" />
          Done
        </Badge>
      );
  }
}

export function ToolActionCard({
  name,
  status,
  summary,
  detail,
}: ToolActionCardProps) {
  return (
    <Card size="sm" className="bg-muted/30 ring-border/60">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="truncate text-sm font-medium">
            {humanizeToolName(name)}
          </CardTitle>
          {summary ? (
            <CardDescription className="line-clamp-2 text-xs">
              {summary}
            </CardDescription>
          ) : null}
        </div>
        {statusBadge(status)}
      </CardHeader>
      {detail ? (
        <CardContent>
          <p className="text-muted-foreground line-clamp-3 text-xs">{detail}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function summarizeToolOutput(output: unknown): {
  summary?: string;
  detail?: string;
  status: ToolActionStatus;
} {
  if (output == null) return { status: "done" };
  if (typeof output === "string") return { summary: output, status: "done" };
  if (typeof output !== "object") {
    return { summary: String(output), status: "done" };
  }

  const o = output as Record<string, unknown>;
  if (o.status === "blocked" || o.blockedReason || o.approvalTaskId) {
    return {
      status: "needs_approval",
      summary:
        typeof o.blockedReason === "string"
          ? o.blockedReason
          : "Waiting on human approval",
      detail:
        typeof o.summary === "string"
          ? o.summary
          : typeof o.resultSummary === "string"
            ? o.resultSummary
            : undefined,
    };
  }
  if (o.status === "failed" || o.error) {
    return {
      status: "error",
      summary: typeof o.error === "string" ? o.error : "Tool failed",
    };
  }

  const summary =
    (typeof o.summary === "string" && o.summary) ||
    (typeof o.resultSummary === "string" && o.resultSummary) ||
    (typeof o.purpose === "string" && o.purpose) ||
    undefined;

  let detail: string | undefined;
  if (Array.isArray(o.candidates)) {
    detail = `${o.candidates.length} candidate(s)`;
  } else if (typeof o.evidenceGained === "number") {
    detail = `${o.evidenceGained} evidence point(s)`;
  } else if (typeof o.saved === "boolean" && o.saved) {
    detail = "Saved";
  }

  return { status: "done", summary, detail };
}

export function toolPartStatus(
  state: string | undefined,
): ToolActionStatus {
  if (
    state === "input-streaming" ||
    state === "input-available" ||
    state === "approval-requested"
  ) {
    if (state === "approval-requested") return "needs_approval";
    return "running";
  }
  if (state === "output-error" || state === "output-denied") return "error";
  if (state === "approval-responded") return "needs_approval";
  return "done";
}
