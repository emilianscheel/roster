import { requireSession } from "@/lib/auth/session";
import { ToolsWorkbench } from "@/components/tools-workbench";
import { getZeroToolsForOrg } from "@/lib/zero/tools-live";

export default async function ToolsPage() {
  const { orgId } = await requireSession();
  const { tools, live } = await getZeroToolsForOrg(orgId);

  return <ToolsWorkbench initialTools={tools} live={live} />;
}
