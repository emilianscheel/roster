import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import {
  decryptConnectionTokens,
  deleteZeroConnection,
  getZeroConnection,
} from "@/lib/zero/connection";
import { getZeroPublicClient } from "@/lib/zero/sdk";

export async function POST() {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getZeroConnection(ctx.orgId);
  if (row) {
    try {
      const { refreshToken } = decryptConnectionTokens(row);
      const client = getZeroPublicClient();
      await client.auth.logout(refreshToken);
    } catch {
      // Best-effort revoke; always clear local connection.
    }
    await deleteZeroConnection(ctx.orgId);
  }

  return NextResponse.json({ ok: true });
}
