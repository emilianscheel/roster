import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import { loadZeroPublicStatus } from "@/lib/zero/status";

export async function GET() {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await loadZeroPublicStatus(ctx.orgId);
  return NextResponse.json(status);
}
