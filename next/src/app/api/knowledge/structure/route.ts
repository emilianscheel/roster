import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { z } from "zod";
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

const structureSchema = z.object({
  title: z.string(),
  markdown: z.string(),
  tool: z.string().nullish(),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      { error: "AI Gateway not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.5"),
    schema: structureSchema,
    system: `You turn rough recruiting notes into a clear best-practice snippet for Roster.
Return a concise title and useful markdown body.
Optionally set tool (product/service name) and tags when obvious from the text.
Keep the same intent. Do not invent unrelated advice.`,
    prompt: `Structure this dump into one best practice:\n\n${text}`,
  });

  const title = object.title.trim();
  const markdown = object.markdown.trim();
  if (!title || !markdown) {
    return NextResponse.json(
      { error: "Failed to structure best practice" },
      { status: 502 },
    );
  }

  const id = crypto.randomUUID();
  const tool = object.tool?.trim() || null;
  const tags = object.tags ?? [];

  await db.insert(knowledgeSnippets).values({
    id,
    organizationId: ctx.orgId,
    title,
    markdown,
    tool,
    tags,
  });

  return NextResponse.json({ id, title, markdown, tool, tags });
}
