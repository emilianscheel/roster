import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { roles, zeroCalls } from "@/lib/db/schema";
import {
  buildArenaActivityCsv,
  buildArenaByServiceCsv,
  type ArenaCallExport,
} from "@/lib/arena/export";
import { ExportMenu } from "@/components/spend/export-menu";
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
    .where(eq(zeroCalls.roleId, id))
    .orderBy(desc(zeroCalls.createdAt));

  const exportRows: ArenaCallExport[] = calls.map((c) => ({
    id: c.id,
    roleId: c.roleId,
    candidateId: c.candidateId,
    service: c.service,
    capability: c.capability,
    purpose: c.purpose,
    quotedCents: Number(c.quotedCents),
    actualCents: Number(c.actualCents),
    latencyMs: c.latencyMs,
    status: c.status,
    evidenceGained: c.evidenceGained,
    createdAt: c.createdAt,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Arena</h1>
        <ExportMenu
          options={[
            {
              label: "Activity log (.csv)",
              filename: "role-arena-activity.csv",
              csv: buildArenaActivityCsv(exportRows, { includeRoleId: false }),
            },
            {
              label: "By service (.csv)",
              filename: "role-arena-by-service.csv",
              csv: buildArenaByServiceCsv(exportRows),
            },
          ]}
        />
      </div>
      <ZeroCallsTable calls={calls} />
    </div>
  );
}
