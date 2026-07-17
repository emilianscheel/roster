import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import { saveZeroConnection } from "@/lib/zero/connection";
import {
  ensureOrgWalletAddress,
  getOrgZeroClient,
  getZeroPublicClient,
} from "@/lib/zero/sdk";

export async function POST(req: Request) {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { deviceCode?: string };
  if (!body.deviceCode) {
    return NextResponse.json({ error: "deviceCode required" }, { status: 400 });
  }

  try {
    const client = getZeroPublicClient();
    const result = await client.auth.device.poll(body.deviceCode);

    if (result.status === "pending") {
      return NextResponse.json({
        status: "pending",
        userCode: result.userCode,
        verificationUri: result.verificationUri,
      });
    }

    if (result.status === "expired") {
      return NextResponse.json({ status: "expired" });
    }

    await saveZeroConnection({
      organizationId: ctx.orgId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      zeroUserId: result.user.id,
      zeroEmail: result.user.email,
      liveEnabled: false,
    });

    const sessionClient = await getOrgZeroClient(ctx.orgId);
    let walletAddress: string | null = null;
    if (sessionClient) {
      walletAddress = await ensureOrgWalletAddress(ctx.orgId, sessionClient);
    }

    return NextResponse.json({
      status: "ok",
      zeroUserId: result.user.id,
      zeroEmail: result.user.email,
      walletAddress,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to finish Zero login";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
