import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import {
  getZeroConnection,
  isGlobalDemoMode,
  updateZeroConnectionMeta,
} from "@/lib/zero/connection";

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

  if (isGlobalDemoMode()) {
    return NextResponse.json(
      {
        error:
          "DEMO_MODE is on globally. Set DEMO_MODE=false in .env to enable live Zero calls.",
      },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  const liveEnabled = body.enabled !== false;

  await updateZeroConnectionMeta(ctx.orgId, { liveEnabled });

  return NextResponse.json({ liveEnabled });
}
