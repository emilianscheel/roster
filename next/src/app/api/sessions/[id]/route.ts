import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { agentMessages, agentSessions } from "@/lib/db/schema";

async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.id, id),
        eq(agentSessions.organizationId, ctx.orgId),
        eq(agentSessions.userId, ctx.session.user.id),
      ),
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, id))
    .orderBy(asc(agentMessages.createdAt));

  return NextResponse.json({ session: row, messages });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [row] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.id, id),
        eq(agentSessions.organizationId, ctx.orgId),
      ),
    )
    .limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as {
    role: string;
    content: string;
    parts?: unknown;
  };

  const messageId = crypto.randomUUID();
  await db.insert(agentMessages).values({
    id: messageId,
    sessionId: id,
    role: body.role,
    content: body.content,
    parts: body.parts ?? null,
  });

  const titleUpdate =
    row.title === "New session" && body.role === "user"
      ? body.content.trim().slice(0, 72) || row.title
      : row.title;

  await db
    .update(agentSessions)
    .set({ title: titleUpdate, updatedAt: new Date() })
    .where(eq(agentSessions.id, id));

  return NextResponse.json({ id: messageId, title: titleUpdate });
}
