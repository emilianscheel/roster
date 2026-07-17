import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { knowledgeSnippets } from "@/lib/db/schema";

async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    title?: string;
    markdown?: string;
    tool?: string;
    tags?: string[];
  };

  const title = body.title?.trim();
  const markdown = body.markdown?.trim();
  if (!title || !markdown) {
    return NextResponse.json(
      { error: "Title and markdown required" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  await db.insert(knowledgeSnippets).values({
    id,
    organizationId: ctx.orgId,
    title,
    markdown,
    tool: body.tool?.trim() || null,
    tags: body.tags ?? [],
  });

  return NextResponse.json({ id, title });
}
