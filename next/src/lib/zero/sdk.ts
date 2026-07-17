import { ZeroClient } from "@zeroxyz/sdk";
import {
  decryptConnectionTokens,
  getZeroConnection,
  updateZeroConnectionMeta,
  updateZeroTokens,
} from "@/lib/zero/connection";

const baseClient = new ZeroClient();

/** Unauthenticated client for device login start/poll. */
export function getZeroPublicClient() {
  return baseClient;
}

/**
 * Session-mode client for an org that has completed Zero device login.
 * Persists rotated refresh tokens via onRefreshed.
 */
export async function getOrgZeroClient(
  organizationId: string,
): Promise<ZeroClient | null> {
  const row = await getZeroConnection(organizationId);
  if (!row) return null;

  const { accessToken, refreshToken } = decryptConnectionTokens(row);

  return baseClient.withSession({
    accessToken,
    refreshToken,
    onRefreshed: async (next) => {
      await updateZeroTokens(
        organizationId,
        next.accessToken,
        next.refreshToken,
      );
    },
  });
}

export async function ensureOrgWalletAddress(
  organizationId: string,
  client: ZeroClient,
): Promise<string | null> {
  try {
    const address = await client.wallet.address();
    if (address) {
      await updateZeroConnectionMeta(organizationId, {
        walletAddress: address,
      });
    }
    return address ?? null;
  } catch {
    try {
      await client.wallet.provision();
      const address = await client.wallet.address();
      if (address) {
        await updateZeroConnectionMeta(organizationId, {
          walletAddress: address,
        });
      }
      return address ?? null;
    } catch {
      return null;
    }
  }
}

/** Parse a USDC amount into the dollar scale used by `zero_calls.*Cents`. */
export function usdToLedgerDollars(
  usd: string | number | null | undefined,
): number {
  if (usd == null) return 0;
  const n = typeof usd === "number" ? usd : Number.parseFloat(usd);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 1e6) / 1e6;
}

/** True integer cents → USDC string for `maxPay`. */
export function centsToMaxPay(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "0.05";
  return (cents / 100).toFixed(4).replace(/\.?0+$/, "") || "0.05";
}
