import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { zeroCalls } from "@/lib/db/schema";
import { ZeroCallsTable } from "@/components/zero-calls-table";

export default async function ArenaPage() {
  const { orgId } = await requireSession();
  const calls = await db
    .select()
    .from(zeroCalls)
    .where(eq(zeroCalls.organizationId, orgId))
    .orderBy(desc(zeroCalls.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Arena</h1>
      <ZeroCallsTable calls={calls} />
    </div>
  );
}
