import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, type RoleChatMessage } from "@/lib/db/schema";
import {
  runDemoRecruitingLoop,
  type RecruitingContext,
} from "@/lib/agent/recruiting";

function stepToToolName(step: string): string {
  const s = step.toLowerCase();
  if (s.includes("compil")) return "compileClaims";
  if (s.includes("discover")) return "discoverZeroServices";
  if (s.includes("search")) return "searchCandidates";
  if (s.includes("verif")) return "verifyCandidate";
  if (s.includes("enrich") || s.includes("github") || s.includes("signal"))
    return "callZeroService";
  if (s.includes("outreach") || s.includes("draft")) return "proposeOutreach";
  if (s.includes("unlock") || s.includes("contact")) return "callZeroService";
  if (s.includes("follow-up") || s.includes("followup") || s.includes("call"))
    return "callZeroService";
  if (s.includes("distill") || s.includes("knowledge")) return "distillKnowledge";
  return "callZeroService";
}

/** Map demo loop step strings into a single assistant UIMessage with tool cards. */
export function stepsToAssistantMessage(steps: string[]): UIMessage {
  const parts: UIMessage["parts"] = [
    {
      type: "text",
      text: "Started sourcing from your brief. Here's what I ran:",
      state: "done",
    },
  ];

  for (const step of steps) {
    const toolName = stepToToolName(step);
    const toolCallId = crypto.randomUUID();
    parts.push({
      type: "dynamic-tool",
      toolName,
      toolCallId,
      state: "output-available",
      input: { summary: step.replace(/…$/, "") },
      output: { ok: true, summary: step.replace(/…$/, "").replace(/\.$/, "") },
    });
  }

  parts.push({
    type: "text",
    text: "Pipeline is ready for review. Ask me to verify someone, draft outreach, unlock a contact, or dig deeper with Zero tools.",
    state: "done",
  });

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts,
  };
}

export function mockFollowupAssistant(userText: string): UIMessage {
  const lower = userText.toLowerCase();
  let toolName = "callZeroService";
  let summary = "Looked up related Zero capabilities for your request";
  let reply =
    "Got it. In demo mode I can walk the pipeline, queue approvals, and call mocked Zero tools. Try asking me to verify a candidate or draft outreach.";

  if (lower.includes("outreach") || lower.includes("email") || lower.includes("message")) {
    toolName = "proposeOutreach";
    summary = "Drafted outreach and queued for approval";
    reply =
      "I drafted outreach and sent it to Approvals — nothing sends without a human OK.";
  } else if (lower.includes("unlock") || lower.includes("contact") || lower.includes("email address")) {
    toolName = "callZeroService";
    summary = "Queued contact unlock for approval";
    reply =
      "Contact unlock needs approval. I queued a task under Approvals (mocked Zero contact service).";
  } else if (lower.includes("verif") || lower.includes("evidence") || lower.includes("check")) {
    toolName = "verifyCandidate";
    summary = "Ran targeted verification against must-have claims";
    reply =
      "Ran a mocked verification pass. Open Pipeline or Evidence to inspect the updated dossier.";
  } else if (lower.includes("search") || lower.includes("find") || lower.includes("source")) {
    toolName = "searchCandidates";
    summary = "Ran a low-cost candidate search via Zero";
    reply =
      "Ran another mocked search pass and refreshed the pool. Check Pipeline for new or updated candidates.";
  } else if (lower.includes("discover") || lower.includes("zero") || lower.includes("tool")) {
    toolName = "discoverZeroServices";
    summary = "Discovered Zero capabilities for this role";
    reply =
      "Pulled the mocked Zero catalog for this role — search, enrich, GitHub signals, and outreach services are available.";
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [
      {
        type: "dynamic-tool",
        toolName,
        toolCallId: crypto.randomUUID(),
        state: "output-available",
        input: { query: userText.slice(0, 160) },
        output: { ok: true, summary, demo: true },
      },
      {
        type: "text",
        text: reply,
        state: "done",
      },
    ],
  };
}

export async function runDemoSeedTurn(
  ctx: RecruitingContext,
  brief: string,
  incoming: UIMessage[],
  opts?: { alreadySourced?: boolean },
): Promise<{ assistant: UIMessage; messages: UIMessage[] }> {
  let assistant: UIMessage;
  if (opts?.alreadySourced) {
    assistant = {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        {
          type: "text",
          text: "This role already has pipeline activity. Ask me to verify a candidate, draft outreach, unlock a contact, or dig deeper with Zero tools.",
          state: "done",
        },
      ],
    };
  } else {
    const steps = await runDemoRecruitingLoop(ctx, brief);
    assistant = stepsToAssistantMessage(steps);
  }

  const userMessages =
    incoming.length > 0
      ? incoming
      : [
          {
            id: crypto.randomUUID(),
            role: "user" as const,
            parts: [{ type: "text" as const, text: brief, state: "done" as const }],
          },
        ];
  const messages = [...userMessages, assistant];
  await saveChatMessages(ctx.roleId, messages);
  return { assistant, messages };
}

export async function saveChatMessages(
  roleId: string,
  messages: UIMessage[],
) {
  await db
    .update(roles)
    .set({
      chatMessages: messages as unknown as RoleChatMessage[],
      updatedAt: new Date(),
    })
    .where(eq(roles.id, roleId));
}

export function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}
