"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ListChecks,
  Loader2,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolActionStatus = "running" | "done" | "needs_approval" | "error";

type ToolActionCardProps = {
  name: string;
  status: ToolActionStatus;
  summary?: string;
  detail?: string;
};

const TOOL_ICONS: Record<string, LucideIcon> = {
  compileClaims: ListChecks,
  discoverZeroServices: Sparkles,
  searchCandidates: Search,
  verifyCandidate: ShieldCheck,
  proposeOutreach: Mail,
  distillKnowledge: BookOpen,
  callZeroService: Sparkles,
};

function humanizeToolName(name: string) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function statusLabel(status: ToolActionStatus): string | null {
  switch (status) {
    case "running":
      return "Running";
    case "needs_approval":
      return "Needs approval";
    case "error":
      return "Failed";
    default:
      return null;
  }
}

export function ToolActionCard({
  name,
  status,
  summary,
  detail,
}: ToolActionCardProps) {
  const [open, setOpen] = useState(false);
  const Icon = TOOL_ICONS[name] ?? Wrench;
  const label = humanizeToolName(name);
  const nonDoneStatus = statusLabel(status);
  const hasDetails = Boolean(summary || detail || nonDoneStatus);

  return (
    <div className="w-full max-w-sm">
      <button
        type="button"
        className={cn(
          "group flex w-full items-center rounded-sm py-0.5 text-left",
          "text-muted-foreground transition-colors",
          hasDetails && "hover:text-foreground",
          !hasDetails && "cursor-default",
        )}
        aria-expanded={hasDetails ? open : undefined}
        disabled={!hasDetails}
        onClick={() => {
          if (!hasDetails) return;
          setOpen((v) => !v);
        }}
      >
        {status === "running" ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin" />
        ) : (
          <Icon className="size-3.5 shrink-0" />
        )}
        <span className="ml-2 min-w-0 truncate text-xs font-medium">{label}</span>
        {hasDetails ? (
          <ChevronRight
            className={cn(
              "ml-1.5 size-3.5 shrink-0 opacity-0 transition-all",
              "group-hover:opacity-100",
              open && "rotate-90 opacity-100",
            )}
          />
        ) : null}
      </button>

      {hasDetails ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="text-muted-foreground space-y-1 pt-1.5 pl-6 text-xs">
              {nonDoneStatus ? <p>{nonDoneStatus}</p> : null}
              {summary ? <p>{summary}</p> : null}
              {detail ? <p>{detail}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
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
