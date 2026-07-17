import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { approvalTasks, candidates, people } from "@/lib/db/schema";

export type ApprovalTaskView = {
  id: string;
  title: string;
  kind: string;
  status: string;
  payload: Record<string, unknown> | null;
  reformNotes: string | null;
  candidateId: string | null;
  recipientEmail: string | null;
  candidateName: string | null;
  remindAt: string | null;
  createdAt: string;
};

export async function loadApprovalTasks(
  orgId: string,
): Promise<ApprovalTaskView[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: approvalTasks.id,
      title: approvalTasks.title,
      kind: approvalTasks.kind,
      status: approvalTasks.status,
      payload: approvalTasks.payload,
      reformNotes: approvalTasks.reformNotes,
      candidateId: approvalTasks.candidateId,
      remindAt: approvalTasks.remindAt,
      createdAt: approvalTasks.createdAt,
      candidateName: candidates.name,
      recipientEmail: people.email,
    })
    .from(approvalTasks)
    .leftJoin(candidates, eq(approvalTasks.candidateId, candidates.id))
    .leftJoin(people, eq(candidates.personId, people.id))
    .where(
      and(
        eq(approvalTasks.organizationId, orgId),
        or(isNull(approvalTasks.remindAt), lte(approvalTasks.remindAt, now)),
      ),
    );

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      status: row.status,
      payload: (row.payload as Record<string, unknown>) || null,
      reformNotes: row.reformNotes,
      candidateId: row.candidateId,
      recipientEmail: row.recipientEmail ?? null,
      candidateName: row.candidateName ?? null,
      remindAt: row.remindAt ? row.remindAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}
