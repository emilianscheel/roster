import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { approvalTasks, candidates } from "@/lib/db/schema";

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

  const tasks = await db
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.organizationId, ctx.orgId));

  return NextResponse.json({
    tasks: tasks.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    id: string;
    action: "allow" | "reject" | "reform";
    reformNotes?: string;
    payload?: Record<string, unknown>;
  };

  const [task] = await db
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.id, body.id))
    .limit(1);

  if (!task || task.organizationId !== ctx.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.action === "reject") {
    await db
      .update(approvalTasks)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(approvalTasks.id, body.id));
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (body.action === "reform") {
    await db
      .update(approvalTasks)
      .set({
        status: "reformed",
        reformNotes: body.reformNotes || "",
        payload: { ...(task.payload as object), ...(body.payload || {}) },
        resolvedAt: new Date(),
      })
      .where(eq(approvalTasks.id, body.id));

    // Re-queue as pending with reformed payload
    const newId = crypto.randomUUID();
    await db.insert(approvalTasks).values({
      id: newId,
      organizationId: task.organizationId,
      roleId: task.roleId,
      candidateId: task.candidateId,
      kind: task.kind,
      title: task.title,
      payload: {
        ...(task.payload as object),
        ...(body.payload || {}),
        reformNotes: body.reformNotes,
      },
      status: "pending",
    });
    return NextResponse.json({ ok: true, status: "reformed", id: newId });
  }

  // allow — demo stub only, never real outreach
  await db
    .update(approvalTasks)
    .set({ status: "allowed", resolvedAt: new Date() })
    .where(eq(approvalTasks.id, body.id));

  if (task.candidateId && task.kind === "send_outreach") {
    await db
      .update(candidates)
      .set({
        stage: "contacted",
        currentAction: "Outreach allowed (demo stub)",
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, task.candidateId));
  }
  if (task.candidateId && task.kind === "unlock_contact") {
    await db
      .update(candidates)
      .set({
        contactUnlocked: true,
        currentAction: "Contact unlocked (demo)",
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, task.candidateId));
  }

  return NextResponse.json({
    ok: true,
    status: "allowed",
    note: "Demo stub — no real Zero outreach executed",
  });
}
