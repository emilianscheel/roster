import { desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { zeroCalls } from "@/lib/db/schema";
import {
  buildArenaActivityCsv,
  buildArenaByServiceCsv,
  type ArenaCallExport,
} from "@/lib/arena/export";
import { ExportMenu } from "@/components/spend/export-menu";
import { ZeroCallsTable } from "@/components/zero-calls-table";

export default async function ArenaPage() {
  const { orgId } = await requireSession();
  const calls = await db
    .select()
    .from(zeroCalls)
    .where(eq(zeroCalls.organizationId, orgId))
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
              filename: "arena-activity.csv",
              csv: buildArenaActivityCsv(exportRows, { includeRoleId: true }),
            },
            {
              label: "By service (.csv)",
              filename: "arena-by-service.csv",
              csv: buildArenaByServiceCsv(exportRows),
            },
          ]}
        />
      </div>
      <ZeroCallsTable calls={calls} />
    </div>
  );
}
