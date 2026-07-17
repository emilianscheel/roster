import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { passkey, user } from "@/lib/db/schema";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ registered: false, hasPasskey: false });
  }

  const [pk] = await db
    .select({ id: passkey.id })
    .from(passkey)
    .where(eq(passkey.userId, existing.id))
    .limit(1);

  return NextResponse.json({
    registered: true,
    hasPasskey: Boolean(pk),
  });
}
