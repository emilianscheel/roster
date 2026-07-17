import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureOrgForUser, getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";

async function orgFromSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  let orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) orgId = await ensureOrgForUser(session.user.id, session.user.name);
  return { session, orgId };
}

function parseNonNegInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (n < 0) return null;
  return n;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authCtx = await orgFromSession();
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: roleId } = await ctx.params;
  const body = (await req.json()) as {
    budgetCents?: unknown;
    maxPerCandidateCents?: unknown;
    maxToolCallCents?: unknown;
  };

  const budgetCents = parseNonNegInt(body.budgetCents);
  const maxPerCandidateCents = parseNonNegInt(body.maxPerCandidateCents);
  const maxToolCallCents = parseNonNegInt(body.maxToolCallCents);

  if (
    budgetCents === null ||
    maxPerCandidateCents === null ||
    maxToolCallCents === null
  ) {
    return NextResponse.json(
      { error: "budgetCents, maxPerCandidateCents, and maxToolCallCents are required (≥ 0)" },
      { status: 400 },
    );
  }

  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(eq(roles.id, roleId), eq(roles.organizationId, authCtx.orgId)),
    )
    .limit(1);

  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(roles)
    .set({
      budgetCents,
      maxPerCandidateCents,
      maxToolCallCents,
      updatedAt: new Date(),
    })
    .where(eq(roles.id, roleId))
    .returning();

  return NextResponse.json({
    role: {
      id: updated.id,
      budgetCents: updated.budgetCents,
      maxPerCandidateCents: updated.maxPerCandidateCents,
      maxToolCallCents: updated.maxToolCallCents,
    },
  });
}
