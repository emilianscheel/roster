import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import { getZeroConnection } from "@/lib/zero/connection";
import { getOrgZeroClient } from "@/lib/zero/sdk";

export async function POST(req: Request) {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await getZeroConnection(ctx.orgId);
  if (!row) {
    return NextResponse.json(
      { error: "Connect a Zero account first" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    amount?: string;
    provider?: "coinbase" | "stripe";
  };

  try {
    const client = await getOrgZeroClient(ctx.orgId);
    if (!client) {
      return NextResponse.json(
        { error: "Zero session unavailable" },
        { status: 400 },
      );
    }

    const fundingUrl = await client.wallet.fundingUrl({
      amount: body.amount || "10",
      provider: body.provider || "coinbase",
    });

    return NextResponse.json({ fundingUrl });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create funding URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
