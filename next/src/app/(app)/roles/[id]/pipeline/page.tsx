import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ForceSidebarExpanded } from "@/components/force-sidebar-expanded";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { PipelineCandidate } from "@/components/pipeline/types";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles } from "@/lib/db/schema";
import type { PipelineStage } from "@/lib/pipeline-actions";

export default async function PipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await requireSession();
  const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role || role.organizationId !== orgId) notFound();

  const list = await db
    .select({
      id: candidates.id,
      name: candidates.name,
      headline: candidates.headline,
      stage: candidates.stage,
      matchScore: candidates.matchScore,
      verificationSpendCents: candidates.verificationSpendCents,
      strongestSignal: candidates.strongestSignal,
    })
    .from(candidates)
    .where(eq(candidates.roleId, id));

  const initial: PipelineCandidate[] = list.map((c) => ({
    ...c,
    stage: c.stage as PipelineStage | "rejected",
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ForceSidebarExpanded />
      <PipelineBoard roleId={id} candidates={initial} />
    </div>
  );
}
