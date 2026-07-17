import { requireSession } from "@/lib/auth/session";
import { loadApprovalTasks } from "@/lib/approvals";
import { ApprovalFocus } from "@/components/approval-focus";

export default async function ApprovalsFocusPage() {
  const { orgId } = await requireSession();
  const tasks = await loadApprovalTasks(orgId);

  return <ApprovalFocus tasks={tasks} />;
}
