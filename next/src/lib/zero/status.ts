import {
  getZeroConnection,
  isGlobalDemoMode,
  toPublicConnection,
} from "@/lib/zero/connection";
import { ensureOrgWalletAddress, getOrgZeroClient } from "@/lib/zero/sdk";
import type { ZeroPublicStatus } from "@/lib/zero/types";

export type { ZeroPublicStatus };

/** Load connection + wallet balance for an org (provisions wallet when needed). */
export async function loadZeroPublicStatus(
  orgId: string,
): Promise<ZeroPublicStatus> {
  const row = await getZeroConnection(orgId);
  const publicConn = toPublicConnection(row);
  const demoMode = isGlobalDemoMode();

  if (!row) {
    return {
      ...publicConn,
      balance: null,
      demoMode,
      balanceError: null,
    };
  }

  let balance: string | null = null;
  let walletAddress = publicConn.walletAddress;
  let balanceError: string | null = null;

  try {
    const client = await getOrgZeroClient(orgId);
    if (!client) {
      return {
        ...publicConn,
        walletAddress,
        balance: null,
        demoMode,
        balanceError: "Zero session unavailable",
      };
    }

    // Resolve / provision the managed wallet before reading balance so
    // signup credits and on-chain USDC are visible after connect.
    walletAddress = await ensureOrgWalletAddress(orgId, client);
    try {
      await client.wallet.address();
    } catch {
      // ensureOrgWalletAddress already attempted provision; continue to balance.
    }

    const bal = await client.wallet.balance();
    balance = bal.amount ?? null;
  } catch (err) {
    balanceError =
      err instanceof Error ? err.message : "Could not read wallet balance";
  }

  return {
    ...publicConn,
    walletAddress,
    balance,
    demoMode,
    balanceError,
  };
}
