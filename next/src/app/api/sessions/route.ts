import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
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

export async function GET() {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.organizationId, ctx.orgId),
        eq(agentSessions.userId, ctx.session.user.id),
        eq(agentSessions.kind, "coding"),
      ),
    )
    .orderBy(desc(agentSessions.updatedAt));

  return NextResponse.json({ sessions: list });
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const id = crypto.randomUUID();
  const title = body.title?.trim() || "New session";

  await db.insert(agentSessions).values({
    id,
    organizationId: ctx.orgId,
    userId: ctx.session.user.id,
    kind: "coding",
    title,
  });

  return NextResponse.json({ id, title });
}
