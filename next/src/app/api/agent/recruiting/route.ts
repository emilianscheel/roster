import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { createRecruitingTools, runDemoRecruitingLoop } from "@/lib/agent/recruiting";
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

  if (!process.env.AI_GATEWAY_API_KEY || body.demo) {
    const steps = await runDemoRecruitingLoop(ctx, role.brief);
    return Response.json({ demo: true, steps });
  }

  const tools = createRecruitingTools(ctx);
  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4.5"),
    system: `You are Roster, an evidence-first recruiting agent.
Research tools may run autonomously. Never send outreach or unlock contacts without proposeOutreach (creates HITL approval).
Use Zero discovery, cheap search first, then targeted verification.
Brief:\n${role.brief}`,
    messages: body.messages
      ? await convertToModelMessages(body.messages)
      : [
          {
            role: "user",
            content: `Start sourcing for this role brief:\n\n${role.brief}`,
          },
        ],
    tools,
  });

  return result.toUIMessageStreamResponse();
}
