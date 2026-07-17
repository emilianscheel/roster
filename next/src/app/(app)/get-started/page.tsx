import { requireSession } from "@/lib/auth/session";
import { GetStartedPanel } from "@/components/get-started-panel";
import {
  getZeroConnection,
  isGlobalDemoMode,
  toPublicConnection,
} from "@/lib/zero/connection";
import { ensureOrgWalletAddress, getOrgZeroClient } from "@/lib/zero/sdk";

export default async function GetStartedPage() {
  const { orgId } = await requireSession();
  const row = await getZeroConnection(orgId);
  const publicConn = toPublicConnection(row);

  let balance: string | null = null;
  let walletAddress = publicConn.walletAddress;

  if (row) {
    try {
      const client = await getOrgZeroClient(orgId);
      if (client) {
        if (!walletAddress) {
          walletAddress = await ensureOrgWalletAddress(orgId, client);
        }
        const bal = await client.wallet.balance();
        balance = bal.amount;
      }
    } catch {
      // Ignore stale session for initial paint; client can refresh.
    }
  }

  return (
    <GetStartedPanel
      initialStatus={{
        ...publicConn,
        walletAddress,
        balance,
        demoMode: isGlobalDemoMode(),
      }}
    />
  );
}
