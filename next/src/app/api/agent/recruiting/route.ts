import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { createRecruitingTools, runDemoRecruitingLoop } from "@/lib/agent/recruiting";
import {
  lastUserText,
  mockFollowupAssistant,
  runDemoSeedTurn,
  saveChatMessages,
} from "@/lib/agent/demo-chat";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return new Response("No org", { status: 400 });

  const body = (await req.json()) as {
    messages?: UIMessage[];
    roleId: string;
    demo?: boolean;
  };

  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, body.roleId))
    .limit(1);

  if (!role || role.organizationId !== orgId) {
    return new Response("Not found", { status: 404 });
  }

  const ctx = {
    organizationId: orgId,
    roleId: body.roleId,
    userId: session.user.id,
  };

  // Live panel: keep synchronous demo loop JSON
  if (body.demo === true) {
    const steps = await runDemoRecruitingLoop(ctx, role.brief);
    return Response.json({ demo: true, steps });
  }

  const incoming = body.messages ?? [];
  const hasGateway = Boolean(process.env.AI_GATEWAY_API_KEY);

  // Chat without LLM: seed from demo loop, then mock follow-ups
  if (!hasGateway) {
    const stored = (role.chatMessages ?? []) as unknown as UIMessage[];

    if (stored.length === 0) {
      const { assistant } = await runDemoSeedTurn(ctx, role.brief, incoming, {
        alreadySourced: role.status !== "draft",
      });
      return streamAssistantMessage(assistant, incoming);
    }

    const base = incoming.length > 0 ? incoming : stored;
    const userText = lastUserText(base) || role.brief;
    const assistant = mockFollowupAssistant(userText);
    const next = [...base, assistant];
    await saveChatMessages(body.roleId, next);
    return streamAssistantMessage(assistant, base);
  }

  // Live LLM chat with cheap model
  const tools = createRecruitingTools(ctx);
  const modelMessages =
    incoming.length > 0
      ? await convertToModelMessages(incoming)
      : [
          {
            role: "user" as const,
            content: `Start sourcing for this role brief:\n\n${role.brief}`,
          },
        ];

  const sourcingNote =
    role.status === "draft"
      ? "This role has not been sourced yet — start by compiling claims, discovering Zero services, and searching."
      : "This role already has pipeline activity — prefer follow-up actions (verify, enrich, outreach approvals) unless the user asks to search again.";

  const result = streamText({
    model: gateway("openai/gpt-4.1-nano"),
    system: `You are Roster, an evidence-first recruiting agent for an ongoing Take action chat on one role.
Research tools and Zero services may run autonomously (including callZeroService for any mocked/live Zero capability).
Never send outreach or unlock contacts without proposeOutreach / callZeroService action capabilities that create HITL approval.
Use Zero discovery, cheap search first, then targeted verification.
${sourcingNote}
Brief:
${role.brief}`,
    messages: modelMessages,
    tools,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: incoming,
    onFinish: async ({ messages }) => {
      await saveChatMessages(body.roleId, messages);
    },
  });
}

function streamAssistantMessage(
  assistant: UIMessage,
  originalMessages: UIMessage[],
) {
  const stream = createUIMessageStream({
    originalMessages,
    execute: ({ writer }) => {
      writer.write({ type: "start", messageId: assistant.id });

      for (const part of assistant.parts) {
        if (part.type === "text") {
          const id = crypto.randomUUID();
          writer.write({ type: "text-start", id });
          writer.write({ type: "text-delta", id, delta: part.text });
          writer.write({ type: "text-end", id });
        } else if (part.type === "dynamic-tool") {
          const { toolCallId, toolName, input } = part;
          writer.write({
            type: "tool-input-start",
            toolCallId,
            toolName,
            dynamic: true,
          });
          writer.write({
            type: "tool-input-available",
            toolCallId,
            toolName,
            input,
            dynamic: true,
          });
          if (part.state === "output-available") {
            writer.write({
              type: "tool-output-available",
              toolCallId,
              output: part.output,
            });
          }
        }
      }

      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
