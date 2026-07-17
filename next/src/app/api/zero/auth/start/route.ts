import { NextResponse } from "next/server";
import { requireZeroOrg } from "@/lib/zero/api-auth";
import { getZeroPublicClient } from "@/lib/zero/sdk";

export async function POST() {
  const ctx = await requireZeroOrg();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getZeroPublicClient();
    const device = await client.auth.device.start();
    const url =
      "url" in device && typeof (device as { url?: string }).url === "string"
        ? (device as { url: string }).url
        : `${device.verificationUri}?code=${encodeURIComponent(device.userCode)}`;

    return NextResponse.json({
      deviceCode: device.deviceCode,
      userCode: device.userCode,
      verificationUri: device.verificationUri,
      url,
      pollInterval: device.pollInterval,
      expiresAt: device.expiresAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start Zero login";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
