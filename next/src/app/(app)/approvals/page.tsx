import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { approvalTasks } from "@/lib/db/schema";
import { ApprovalCards } from "@/components/approval-cards";

export default async function ApprovalsPage() {
  const { orgId } = await requireSession();
  const tasks = await db
    .select()
    .from(approvalTasks)
    .where(eq(approvalTasks.organizationId, orgId));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Approvals</h1>
      <ApprovalCards
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          kind: t.kind,
          status: t.status,
          payload: (t.payload as Record<string, unknown>) || null,
          reformNotes: t.reformNotes,
          candidateId: t.candidateId,
        }))}
      />
    </div>
  );
}
