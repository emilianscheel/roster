import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { zeroConnections } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/zero/crypto";

export type ZeroConnectionRow = typeof zeroConnections.$inferSelect;

export type ZeroConnectionPublic = {
  connected: boolean;
  liveEnabled: boolean;
  zeroUserId: string | null;
  zeroEmail: string | null;
  walletAddress: string | null;
  connectedAt: Date | null;
};

export async function getZeroConnection(
  organizationId: string,
): Promise<ZeroConnectionRow | null> {
  const [row] = await db
    .select()
    .from(zeroConnections)
    .where(eq(zeroConnections.organizationId, organizationId))
    .limit(1);
  return row ?? null;
}

export function toPublicConnection(
  row: ZeroConnectionRow | null,
): ZeroConnectionPublic {
  if (!row) {
    return {
      connected: false,
      liveEnabled: false,
      zeroUserId: null,
      zeroEmail: null,
      walletAddress: null,
      connectedAt: null,
    };
  }
  return {
    connected: true,
    liveEnabled: row.liveEnabled,
    zeroUserId: row.zeroUserId,
    zeroEmail: row.zeroEmail,
    walletAddress: row.walletAddress,
    connectedAt: row.connectedAt,
  };
}

export function isGlobalDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export async function isOrgZeroLive(organizationId: string): Promise<boolean> {
  if (isGlobalDemoMode()) return false;
  const row = await getZeroConnection(organizationId);
  return Boolean(row?.liveEnabled);
}

export async function saveZeroConnection(input: {
  organizationId: string;
  accessToken: string;
  refreshToken: string;
  zeroUserId?: string | null;
  zeroEmail?: string | null;
  walletAddress?: string | null;
  liveEnabled?: boolean;
}) {
  const now = new Date();
  const values = {
    organizationId: input.organizationId,
    accessTokenEnc: encryptSecret(input.accessToken),
    refreshTokenEnc: encryptSecret(input.refreshToken),
    zeroUserId: input.zeroUserId ?? null,
    zeroEmail: input.zeroEmail ?? null,
    walletAddress: input.walletAddress ?? null,
    liveEnabled: input.liveEnabled ?? false,
    connectedAt: now,
    updatedAt: now,
  };

  await db
    .insert(zeroConnections)
    .values(values)
    .onConflictDoUpdate({
      target: zeroConnections.organizationId,
      set: {
        accessTokenEnc: values.accessTokenEnc,
        refreshTokenEnc: values.refreshTokenEnc,
        zeroUserId: values.zeroUserId,
        zeroEmail: values.zeroEmail,
        walletAddress: values.walletAddress,
        liveEnabled: values.liveEnabled,
        connectedAt: values.connectedAt,
        updatedAt: values.updatedAt,
      },
    });
}

export async function updateZeroTokens(
  organizationId: string,
  accessToken: string,
  refreshToken: string,
) {
  await db
    .update(zeroConnections)
    .set({
      accessTokenEnc: encryptSecret(accessToken),
      refreshTokenEnc: encryptSecret(refreshToken),
      updatedAt: new Date(),
    })
    .where(eq(zeroConnections.organizationId, organizationId));
}

export async function updateZeroConnectionMeta(
  organizationId: string,
  patch: {
    walletAddress?: string | null;
    liveEnabled?: boolean;
    zeroEmail?: string | null;
  },
) {
  await db
    .update(zeroConnections)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(zeroConnections.organizationId, organizationId));
}

export async function deleteZeroConnection(organizationId: string) {
  await db
    .delete(zeroConnections)
    .where(eq(zeroConnections.organizationId, organizationId));
}

export function decryptConnectionTokens(row: ZeroConnectionRow): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: decryptSecret(row.accessTokenEnc),
    refreshToken: decryptSecret(row.refreshTokenEnc),
  };
}
