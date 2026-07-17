import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";

export async function ensureOrgForUser(userId: string, name: string) {
  const [existing] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  if (existing) {
    return existing.organizationId;
  }
  const { organizations } = await import("@/lib/db/schema");
  const orgId = crypto.randomUUID();
  await db.insert(organizations).values({
    id: orgId,
    name: `${name}'s team`,
  });
  await db.insert(memberships).values({
    id: crypto.randomUUID(),
    organizationId: orgId,
    userId,
    role: "owner",
  });
  return orgId;
}

export async function getOrgIdForUser(userId: string) {
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .limit(1);
  return membership?.organizationId ?? null;
}
