import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import {
  getZeroConnection,
  isGlobalDemoMode,
  toPublicConnection,
} from "@/lib/zero/connection";
import { ensureOrgWalletAddress, getOrgZeroClient } from "@/lib/zero/sdk";

export async function GET() {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getZeroConnection(ctx.orgId);
  const publicConn = toPublicConnection(row);

  if (!row) {
    return NextResponse.json({
      ...publicConn,
      balance: null,
      demoMode: isGlobalDemoMode(),
    });
  }

  let balance: string | null = null;
  let walletAddress = publicConn.walletAddress;

  try {
    const client = await getOrgZeroClient(ctx.orgId);
    if (client) {
      if (!walletAddress) {
        walletAddress = await ensureOrgWalletAddress(ctx.orgId, client);
      }
      const bal = await client.wallet.balance();
      balance = bal.amount;
    }
  } catch {
    // Session may be expired; still return connection metadata.
  }

  return NextResponse.json({
    ...publicConn,
    walletAddress,
    balance,
    demoMode: isGlobalDemoMode(),
  });
}
