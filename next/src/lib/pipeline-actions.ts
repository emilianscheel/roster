"use server";

import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roles } from "@/lib/db/schema";

const STAGES = [
  "discovered",
  "researching",
  "verified",
  "approved",
  "contacted",
  "replied",
  "interview",
] as const;

export type PipelineStage = (typeof STAGES)[number];

function isPipelineStage(value: string): value is PipelineStage {
  return (STAGES as readonly string[]).includes(value);
}

export async function updateCandidateStage({
  roleId,
  candidateId,
  stage,
}: {
  roleId: string;
  candidateId: string;
  stage: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPipelineStage(stage)) {
    return { ok: false, error: "Invalid pipeline stage" };
  }

  const { orgId } = await requireSession();

  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
    .limit(1);

  if (!role) {
    return { ok: false, error: "Role not found" };
  }

  const [updated] = await db
    .update(candidates)
    .set({ stage, updatedAt: new Date() })
    .where(
      and(eq(candidates.id, candidateId), eq(candidates.roleId, roleId)),
    )
    .returning({ id: candidates.id });

  if (!updated) {
    return { ok: false, error: "Candidate not found" };
  }

  return { ok: true };
}
