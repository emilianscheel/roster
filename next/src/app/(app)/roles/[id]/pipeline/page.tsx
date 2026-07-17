import { asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ForceSidebarExpanded } from "@/components/force-sidebar-expanded";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import type { PipelineCandidate } from "@/components/pipeline/types";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  candidates,
  evidence,
  people,
  personEducation,
  personExperiences,
  roles,
} from "@/lib/db/schema";
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
    .select()
    .from(candidates)
    .where(eq(candidates.roleId, id));

  const candIds = list.map((c) => c.id);
  const personIds = [
    ...new Set(
      list.map((c) => c.personId).filter((pid): pid is string => Boolean(pid)),
    ),
  ];

  const [evidenceRows, personRows, experiences, education] = await Promise.all([
    candIds.length === 0
      ? Promise.resolve([])
      : db.select().from(evidence).where(inArray(evidence.candidateId, candIds)),
    personIds.length === 0
      ? Promise.resolve([])
      : db.select().from(people).where(inArray(people.id, personIds)),
    personIds.length === 0
      ? Promise.resolve([])
      : db
          .select()
          .from(personExperiences)
          .where(inArray(personExperiences.personId, personIds))
          .orderBy(asc(personExperiences.sortOrder)),
    personIds.length === 0
      ? Promise.resolve([])
      : db
          .select()
          .from(personEducation)
          .where(inArray(personEducation.personId, personIds))
          .orderBy(asc(personEducation.sortOrder)),
  ]);

  const experiencesByPerson = new Map<string, typeof experiences>();
  for (const row of experiences) {
    const bucket = experiencesByPerson.get(row.personId) ?? [];
    bucket.push(row);
    experiencesByPerson.set(row.personId, bucket);
  }

  const educationByPerson = new Map<string, typeof education>();
  for (const row of education) {
    const bucket = educationByPerson.get(row.personId) ?? [];
    bucket.push(row);
    educationByPerson.set(row.personId, bucket);
  }

  const peopleById = new Map(
    personRows.map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        email: p.email,
        headline: p.headline,
        location: p.location,
        imageUrl: p.imageUrl,
        links: (p.links ?? {}) as Record<string, string>,
        notes: p.notes,
        rawText: p.rawText,
        lastSeenAt: p.lastSeenAt.toISOString(),
        experiences: (experiencesByPerson.get(p.id) ?? []).map((e) => ({
          id: e.id,
          companyName: e.companyName,
          companyDomain: e.companyDomain,
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          isCurrent: e.isCurrent,
          description: e.description,
          sortOrder: e.sortOrder,
        })),
        education: (educationByPerson.get(p.id) ?? []).map((e) => ({
          id: e.id,
          schoolName: e.schoolName,
          schoolDomain: e.schoolDomain,
          degree: e.degree,
          field: e.field,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.description,
          sortOrder: e.sortOrder,
        })),
      },
    ]),
  );

  const evidenceByCandidate = new Map<string, typeof evidenceRows>();
  for (const row of evidenceRows) {
    const bucket = evidenceByCandidate.get(row.candidateId) ?? [];
    bucket.push(row);
    evidenceByCandidate.set(row.candidateId, bucket);
  }

  const initial: PipelineCandidate[] = list.map((c) => ({
    id: c.id,
    personId: c.personId,
    name: c.name,
    headline: c.headline,
    stage: c.stage as PipelineStage | "rejected",
    matchScore: c.matchScore,
    evidenceConfidence: c.evidenceConfidence,
    freshnessDays: c.freshnessDays,
    strongestSignal: c.strongestSignal,
    missingRequirements: c.missingRequirements ?? [],
    contradictions: c.contradictions ?? [],
    verificationSpendCents: c.verificationSpendCents,
    currentAction: c.currentAction,
    contactUnlocked: c.contactUnlocked,
    outreachDraft: c.outreachDraft,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    person: c.personId ? (peopleById.get(c.personId) ?? null) : null,
    evidence: (evidenceByCandidate.get(c.id) ?? []).map((e) => ({
      id: e.id,
      claimLabel: e.claimLabel,
      status: e.status,
      confidence: e.confidence,
      costCents: e.costCents,
      newestEvidenceDays: e.newestEvidenceDays,
      sources: e.sources ?? [],
      supporting: e.supporting,
      contradicting: e.contradicting,
      recommendation: e.recommendation,
    })),
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ForceSidebarExpanded />
      <PipelineBoard roleId={id} candidates={initial} />
    </div>
  );
}
