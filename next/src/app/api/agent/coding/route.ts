import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { createCodingTools } from "@/lib/agent/coding";
import { createAppleSandboxSession } from "@/lib/sandbox/apple-container";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return new Response("No org", { status: 400 });

  const body = (await req.json()) as {
    messages: UIMessage[];
    roleId?: string;
  };

  const sandbox = await createAppleSandboxSession({
    sessionKey: `${session.user.id.slice(0, 8)}-${Date.now()}`,
  });

  const tools = createCodingTools({
    organizationId: orgId,
    userId: session.user.id,
    roleId: body.roleId,
    sandbox,
  });

  const hasKey = Boolean(process.env.AI_GATEWAY_API_KEY);

  if (!hasKey) {
    const last = body.messages.at(-1);
    const text =
      typeof last?.parts?.[0] === "object" &&
      last.parts[0] &&
      "text" in last.parts[0]
        ? String((last.parts[0] as { text: string }).text)
        : "help";

    const shell = await sandbox.run({
      command: `echo "Roster coding agent (demo). You said: ${text.replace(/"/g, '\\"')}" && zero --help && ls -la`,
    });

    const message = `Demo mode (no AI_GATEWAY_API_KEY).\n\nSandbox \`${sandbox.name}\`:\n\`\`\`\n${shell.stdout || shell.stderr}\n\`\`\`\n\nResearch tools can run via \`zero\`; outreach stays behind Approvals.`;

    return Response.json({
      demo: true,
      sandbox: sandbox.name,
      message,
    });
  }

  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4.5"),
    system: `You are Roster's coding agent inside a local Apple container sandbox (${sandbox.name}).
You have shell, read/write, and zero tools.
Zero action capabilities never send real outreach — they create approval tasks.
Keep responses concise. Prefer tools over speculation.`,
    messages: await convertToModelMessages(body.messages),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
