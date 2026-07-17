import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { createCodingTools } from "@/lib/agent/coding";
import { createAppleSandboxSession } from "@/lib/sandbox/apple-container";
import { db } from "@/lib/db";
import { agentMessages, agentSessions, people, personEducation, personExperiences, roles } from "@/lib/db/schema";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return new Response("No org", { status: 400 });

  const body = (await req.json()) as {
    messages: UIMessage[];
    roleId?: string;
    sessionId?: string;
  };

  if (body.sessionId) {
    const [row] = await db
      .select()
      .from(agentSessions)
      .where(
        and(
          eq(agentSessions.id, body.sessionId),
          eq(agentSessions.organizationId, orgId),
        ),
      )
      .limit(1);
    if (!row) return new Response("Session not found", { status: 404 });
  }

  const sandbox = await createAppleSandboxSession({
    sessionKey: `${session.user.id.slice(0, 8)}-${Date.now()}`,
  });

  const tools = createCodingTools({
    organizationId: orgId,
    userId: session.user.id,
    roleId: body.roleId,
    sandbox,
  });

  const last = body.messages.at(-1);
  const userText =
    typeof last?.parts?.[0] === "object" &&
    last.parts[0] &&
    "text" in last.parts[0]
      ? String((last.parts[0] as { text: string }).text)
      : "";

  if (body.sessionId && userText) {
    await db.insert(agentMessages).values({
      id: crypto.randomUUID(),
      sessionId: body.sessionId,
      role: "user",
      content: userText,
    });
    const [sess] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, body.sessionId))
      .limit(1);
    if (sess?.title === "New session") {
      await db
        .update(agentSessions)
        .set({
          title: userText.trim().slice(0, 72) || "Session",
          updatedAt: new Date(),
        })
        .where(eq(agentSessions.id, body.sessionId));
    } else {
      await db
        .update(agentSessions)
        .set({ updatedAt: new Date() })
        .where(eq(agentSessions.id, body.sessionId));
    }
  }

  const hasKey = Boolean(process.env.AI_GATEWAY_API_KEY);

  if (!hasKey) {
    const message = await runDemoAgentTurn({
      orgId,
      userText,
      sandboxName: sandbox.name,
    });

    if (body.sessionId) {
      await db.insert(agentMessages).values({
        id: crypto.randomUUID(),
        sessionId: body.sessionId,
        role: "assistant",
        content: message,
      });
    }

    return Response.json({
      demo: true,
      sandbox: sandbox.name,
      message,
    });
  }

  const result = streamText({
    model: gateway("anthropic/claude-sonnet-4.5"),
    system: `You are Roster's Sessions agent inside a local Apple container sandbox (${sandbox.name}).
You can use shell, read/write, zero, and database tools: listRoles, getRole, upsertPerson, searchPeople, listPeople, linkPersonToRole, setRoleRequirements, setRolePerspectives.
When the user shares a LinkedIn profile or person details, call upsertPerson to store them in the people database.
Zero action capabilities never send real outreach — they create approval tasks.
Keep responses concise. Prefer tools over speculation.`,
    messages: await convertToModelMessages(body.messages),
    tools,
    onFinish: async ({ text }) => {
      if (body.sessionId && text) {
        await db.insert(agentMessages).values({
          id: crypto.randomUUID(),
          sessionId: body.sessionId,
          role: "assistant",
          content: text,
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

async function runDemoAgentTurn(opts: {
  orgId: string;
  userText: string;
  sandboxName: string;
}) {
  const text = opts.userText.trim();
  const lower = text.toLowerCase();

  if (
    /(store|save|add).*(person|profile|linkedin)/i.test(text) ||
    /linkedin\.com\/in\//i.test(text)
  ) {
    const nameMatch =
      text.match(/(?:named?|is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/) ||
      text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);
    const linkedin =
      text.match(/https?:\/\/[^\s]*linkedin\.com\/in\/[^\s]+/i)?.[0] ||
      undefined;
    const name = nameMatch?.[1] || "Unknown Person";
    const id = crypto.randomUUID();
    const headline =
      text.match(/[—\-–]\s*(.+?)(?:\n|$)/)?.[1]?.trim() ||
      "Engineer";
    await db.insert(people).values({
      id,
      organizationId: opts.orgId,
      name,
      headline,
      location: "San Francisco Bay Area",
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      notes: text.slice(0, 500),
      rawText: text.slice(0, 4000),
      links: linkedin ? { linkedin } : {},
    });
    await db.insert(personExperiences).values([
      {
        id: crypto.randomUUID(),
        personId: id,
        companyName: "Stripe",
        companyDomain: "stripe.com",
        title: "Staff Software Engineer",
        startDate: "2022-01",
        isCurrent: true,
        description: "Infrastructure and developer platform.",
        sortOrder: 0,
      },
      {
        id: crypto.randomUUID(),
        personId: id,
        companyName: "Airbnb",
        companyDomain: "airbnb.com",
        title: "Senior Software Engineer",
        startDate: "2018-06",
        endDate: "2021-12",
        description: "Payments and reliability.",
        sortOrder: 1,
      },
    ]);
    await db.insert(personEducation).values({
      id: crypto.randomUUID(),
      personId: id,
      schoolName: "Stanford University",
      schoolDomain: "stanford.edu",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2014",
      endDate: "2018",
      sortOrder: 0,
    });
    return `Stored **${name}** in the people database (\`${id}\`) with sample career and education.\n\nDemo mode — no AI_GATEWAY_API_KEY.`;
  }

  if (/list roles|show roles/i.test(lower)) {
    const list = await db
      .select({
        id: roles.id,
        title: roles.title,
        status: roles.status,
      })
      .from(roles)
      .where(eq(roles.organizationId, opts.orgId));
    return `Roles:\n\`\`\`json\n${JSON.stringify(list, null, 2)}\n\`\`\``;
  }

  if (/list people|show people/i.test(lower)) {
    const list = await db
      .select({
        id: people.id,
        name: people.name,
        headline: people.headline,
      })
      .from(people)
      .where(eq(people.organizationId, opts.orgId))
      .limit(25);
    return `People:\n\`\`\`json\n${JSON.stringify(list, null, 2)}\n\`\`\``;
  }

  const count = await db
    .select({ id: people.id })
    .from(people)
    .where(eq(people.organizationId, opts.orgId));

  return `Demo mode (no AI_GATEWAY_API_KEY).\n\nSandbox \`${opts.sandboxName}\`.\nPeople in DB: ${count.length}.\n\nTry: "Store this LinkedIn person: Jane Doe https://linkedin.com/in/janedoe — Staff Rust engineer"\nor "List roles" / "List people".`;
}
