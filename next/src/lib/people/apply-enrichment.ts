import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  people,
  personEducation,
  personExperiences,
} from "@/lib/db/schema";
import type { PersonListItem } from "@/components/people/types";
import {
  PERSON_ENRICH_TOOLS,
  type MockPersonEnrichResult,
  type PersonEnrichToolId,
} from "@/lib/zero/mock-person-enrich";
import { normalizePersonLinkUrl } from "@/lib/people-links";

export async function applyPersonEnrichment(input: {
  personId: string;
  organizationId: string;
  toolId: PersonEnrichToolId;
  result: MockPersonEnrichResult;
}): Promise<PersonListItem | null> {
  const { personId, organizationId, toolId, result } = input;
  const profile = result.profile;

  const [existing] = await db
    .select()
    .from(people)
    .where(
      and(eq(people.id, personId), eq(people.organizationId, organizationId)),
    )
    .limit(1);

  if (!existing) return null;

  const toolName =
    PERSON_ENRICH_TOOLS.find((t) => t.id === toolId)?.name ?? toolId;

  const mergedLinks: Record<string, string> = {
    ...((existing.links ?? {}) as Record<string, string>),
  };
  for (const [key, url] of Object.entries(profile.links ?? {})) {
    if (!url?.trim()) continue;
    mergedLinks[key] = normalizePersonLinkUrl(url);
  }

  const noteLine = `Enriched via ${toolName}`;
  const nextNotes = existing.notes?.includes(noteLine)
    ? existing.notes
    : [existing.notes?.trim(), noteLine, profile.summary?.trim()]
        .filter(Boolean)
        .join("\n\n");

  await db
    .update(people)
    .set({
      email: profile.email?.trim() || existing.email,
      headline: profile.headline?.trim() || existing.headline,
      location: profile.location?.trim() || existing.location,
      imageUrl: profile.imageUrl?.trim() || existing.imageUrl,
      links: mergedLinks,
      notes: nextNotes || existing.notes,
      lastSeenAt: new Date(),
    })
    .where(eq(people.id, personId));

  const existingExperiences = await db
    .select()
    .from(personExperiences)
    .where(eq(personExperiences.personId, personId))
    .orderBy(asc(personExperiences.sortOrder));

  const experienceKeys = new Set(
    existingExperiences.map(
      (e) =>
        `${e.companyName.trim().toLowerCase()}::${e.title.trim().toLowerCase()}`,
    ),
  );

  let sortOrder = existingExperiences.length;
  for (const exp of profile.experiences ?? []) {
    const key = `${exp.companyName.trim().toLowerCase()}::${exp.title.trim().toLowerCase()}`;
    if (experienceKeys.has(key)) continue;
    experienceKeys.add(key);
    await db.insert(personExperiences).values({
      id: crypto.randomUUID(),
      personId,
      companyName: exp.companyName,
      companyDomain: exp.companyDomain,
      title: exp.title,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      description: exp.description,
      sortOrder: sortOrder++,
    });
  }

  const existingEducation = await db
    .select()
    .from(personEducation)
    .where(eq(personEducation.personId, personId))
    .orderBy(asc(personEducation.sortOrder));

  const educationKeys = new Set(
    existingEducation.map((e) => e.schoolName.trim().toLowerCase()),
  );

  let eduSort = existingEducation.length;
  for (const edu of profile.education ?? []) {
    const key = edu.schoolName.trim().toLowerCase();
    if (educationKeys.has(key)) continue;
    educationKeys.add(key);
    await db.insert(personEducation).values({
      id: crypto.randomUUID(),
      personId,
      schoolName: edu.schoolName,
      schoolDomain: edu.schoolDomain,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate,
      description: edu.description,
      sortOrder: eduSort++,
    });
  }

  return loadPersonListItem(personId, organizationId);
}

export async function loadPersonListItem(
  personId: string,
  organizationId: string,
): Promise<PersonListItem | null> {
  const [row] = await db
    .select()
    .from(people)
    .where(
      and(eq(people.id, personId), eq(people.organizationId, organizationId)),
    )
    .limit(1);

  if (!row) return null;

  const [experiences, education] = await Promise.all([
    db
      .select()
      .from(personExperiences)
      .where(eq(personExperiences.personId, personId))
      .orderBy(asc(personExperiences.sortOrder)),
    db
      .select()
      .from(personEducation)
      .where(eq(personEducation.personId, personId))
      .orderBy(asc(personEducation.sortOrder)),
  ]);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    headline: row.headline,
    location: row.location,
    imageUrl: row.imageUrl,
    links: (row.links ?? {}) as Record<string, string>,
    notes: row.notes,
    rawText: row.rawText,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    experiences: experiences.map((e) => ({
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
    education: education.map((e) => ({
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
  };
}
