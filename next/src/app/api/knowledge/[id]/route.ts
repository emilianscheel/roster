import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
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

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [snippet] = await db
    .select()
    .from(knowledgeSnippets)
    .where(eq(knowledgeSnippets.id, id))
    .limit(1);

  if (!snippet || snippet.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json()) as {
    title?: string;
    markdown?: string;
    tool?: string | null;
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

  await db
    .update(knowledgeSnippets)
    .set({
      title,
      markdown,
      ...(body.tool !== undefined ? { tool: body.tool?.trim() || null } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
    })
    .where(eq(knowledgeSnippets.id, id));

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [snippet] = await db
    .select()
    .from(knowledgeSnippets)
    .where(eq(knowledgeSnippets.id, id))
    .limit(1);

  if (!snippet || snippet.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(knowledgeSnippets).where(eq(knowledgeSnippets.id, id));
  return NextResponse.json({ ok: true });
}
