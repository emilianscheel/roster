import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureOrgForUser, getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { runDemoRecruitingLoop } from "@/lib/agent/recruiting";

async function orgFromSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  let orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) orgId = await ensureOrgForUser(session.user.id, session.user.name);
  return { session, orgId };
}

export async function GET() {
  const ctx = await orgFromSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, ctx.orgId))
    .orderBy(desc(roles.createdAt));

  return NextResponse.json({ roles: list });
}

export async function POST(req: Request) {
  const ctx = await orgFromSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { brief?: string; start?: boolean };
  const brief = body.brief?.trim();
  if (!brief) {
    return NextResponse.json({ error: "Brief required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const title =
    brief.split(/[\n.!?]/)[0]?.trim().slice(0, 72) || "Untitled role";

  await db.insert(roles).values({
    id,
    organizationId: ctx.orgId,
    createdById: ctx.session.user.id,
    title,
    brief,
    status: "draft",
  });

  if (body.start !== false) {
    // Fire demo recruiting loop (works without LLM key)
    await runDemoRecruitingLoop(
      {
        organizationId: ctx.orgId,
        roleId: id,
        userId: ctx.session.user.id,
      },
      brief,
    );
  }

  return NextResponse.json({ id, title });
}
