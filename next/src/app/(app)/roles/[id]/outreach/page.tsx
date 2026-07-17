import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ApprovalsWorkbench } from "@/components/approvals-workbench";
import { requireSession } from "@/lib/auth/session";
import { loadApprovalTasks } from "@/lib/approvals";
import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";

export default async function OutreachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const tasks = await loadApprovalTasks(orgId, {
    roleId: id,
    kind: "send_outreach",
  });

  return (
    <ApprovalsWorkbench
      tasks={tasks}
      title="Outreach"
      lockedKind="send_outreach"
      showFocus={false}
      emptyMessage="No pending outreach"
      searchPlaceholder="Search outreach…"
    />
  );
}
