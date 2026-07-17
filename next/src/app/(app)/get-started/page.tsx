import { requireSession } from "@/lib/auth/session";
import { GetStartedPanel } from "@/components/get-started-panel";
import { loadZeroPublicStatus } from "@/lib/zero/status";

export default async function GetStartedPage() {
  const { orgId } = await requireSession();
  const initialStatus = await loadZeroPublicStatus(orgId);

  return <GetStartedPanel initialStatus={initialStatus} />;
}
