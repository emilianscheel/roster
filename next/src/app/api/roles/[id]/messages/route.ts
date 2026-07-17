import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { roles, type RoleChatMessage } from "@/lib/db/schema";

async function authorizeRole(roleId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  if (!role || role.organizationId !== orgId) return null;
  return role;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = await authorizeRole(id);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ messages: role.chatMessages ?? [] });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const role = await authorizeRole(id);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { messages?: RoleChatMessage[] };
  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  await db
    .update(roles)
    .set({ chatMessages: body.messages, updatedAt: new Date() })
    .where(eq(roles.id, id));

  return NextResponse.json({ ok: true });
}
