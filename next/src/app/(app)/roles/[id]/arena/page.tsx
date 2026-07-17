import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles, zeroCalls } from "@/lib/db/schema";
import { ZeroCallsTable } from "@/components/zero-calls-table";

export default async function RoleArenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const calls = await db
    .select()
    .from(zeroCalls)
    .where(eq(zeroCalls.roleId, id));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Arena</h1>
      <ZeroCallsTable calls={calls} />
    </div>
  );
}
