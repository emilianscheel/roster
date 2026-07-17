import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { knowledgeSnippets } from "@/lib/db/schema";

export const maxDuration = 60;

async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}

const refineSchema = z.object({
  title: z.string(),
  markdown: z.string(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      { error: "AI Gateway not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const [snippet] = await db
    .select()
    .from(knowledgeSnippets)
    .where(eq(knowledgeSnippets.id, id))
    .limit(1);

  if (!snippet || snippet.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { object: refined } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.5"),
    schema: refineSchema,
    system: `You refine recruiting best-practice snippets for Roster.
Improve clarity, structure, and usefulness. Keep the same intent.
Return a concise title and markdown body. Do not invent unrelated advice.`,
    prompt: `Refine this best practice.

Title: ${snippet.title}
${snippet.tool ? `Tool: ${snippet.tool}\n` : ""}
Markdown:
${snippet.markdown}`,
  });

  if (!refined.title.trim() || !refined.markdown.trim()) {
    return NextResponse.json(
      { error: "Failed to refine snippet" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    title: refined.title.trim(),
    markdown: refined.markdown.trim(),
  });
}
