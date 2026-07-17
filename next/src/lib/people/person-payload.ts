import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  people,
  personEducation,
  personExperiences,
} from "@/lib/db/schema";
import type { PersonListItem } from "@/components/people/types";
import { normalizePersonLinkUrl } from "@/lib/people-links";
import { loadPersonListItem } from "@/lib/people/apply-enrichment";

export const experiencePayloadSchema = z.object({
  companyName: z.string().min(1),
  companyDomain: z.string().nullable().optional(),
  title: z.string().min(1),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

export const educationPayloadSchema = z.object({
  schoolName: z.string().min(1),
  schoolDomain: z.string().nullable().optional(),
  degree: z.string().nullable().optional(),
  field: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const personPayloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  links: z.record(z.string(), z.string()).optional(),
  notes: z.string().nullable().optional(),
  rawText: z.string().nullable().optional(),
  experiences: z.array(experiencePayloadSchema).optional(),
  education: z.array(educationPayloadSchema).optional(),
});

export type PersonPayload = z.infer<typeof personPayloadSchema>;

export const peopleStructureSchema = z.object({
  people: z.array(personPayloadSchema).min(1),
});

function trimOrNull(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function normalizeLinks(
  links: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, url] of Object.entries(links ?? {})) {
    const k = key.trim();
    const u = url?.trim();
    if (!k || !u) continue;
    out[k] = normalizePersonLinkUrl(u);
  }
  return out;
}

function normalizePayload(payload: PersonPayload): Required<
  Pick<
    PersonPayload,
    | "name"
    | "email"
    | "headline"
    | "location"
    | "imageUrl"
    | "links"
    | "notes"
    | "rawText"
    | "experiences"
    | "education"
  >
> {
  return {
    name: payload.name.trim(),
    email: trimOrNull(payload.email),
    headline: trimOrNull(payload.headline),
    location: trimOrNull(payload.location),
    imageUrl: trimOrNull(payload.imageUrl),
    links: normalizeLinks(payload.links),
    notes: trimOrNull(payload.notes),
    rawText: trimOrNull(payload.rawText),
    experiences: (payload.experiences ?? [])
      .filter((e) => e.companyName.trim() && e.title.trim())
      .map((e) => ({
        companyName: e.companyName.trim(),
        companyDomain: trimOrNull(e.companyDomain),
        title: e.title.trim(),
        startDate: trimOrNull(e.startDate),
        endDate: trimOrNull(e.endDate),
        isCurrent: e.isCurrent ?? false,
        description: trimOrNull(e.description),
      })),
    education: (payload.education ?? [])
      .filter((e) => e.schoolName.trim())
      .map((e) => ({
        schoolName: e.schoolName.trim(),
        schoolDomain: trimOrNull(e.schoolDomain),
        degree: trimOrNull(e.degree),
        field: trimOrNull(e.field),
        startDate: trimOrNull(e.startDate),
        endDate: trimOrNull(e.endDate),
        description: trimOrNull(e.description),
      })),
  };
}

async function replaceExperiences(
  personId: string,
  experiences: NonNullable<PersonPayload["experiences"]>,
) {
  await db
    .delete(personExperiences)
    .where(eq(personExperiences.personId, personId));

  if (experiences.length === 0) return;

  await db.insert(personExperiences).values(
    experiences.map((exp, index) => ({
      id: crypto.randomUUID(),
      personId,
      companyName: exp.companyName,
      companyDomain: exp.companyDomain ?? null,
      title: exp.title,
      startDate: exp.startDate ?? null,
      endDate: exp.endDate ?? null,
      isCurrent: exp.isCurrent ?? false,
      description: exp.description ?? null,
      sortOrder: index,
    })),
  );
}

async function replaceEducation(
  personId: string,
  education: NonNullable<PersonPayload["education"]>,
) {
  await db
    .delete(personEducation)
    .where(eq(personEducation.personId, personId));

  if (education.length === 0) return;

  await db.insert(personEducation).values(
    education.map((edu, index) => ({
      id: crypto.randomUUID(),
      personId,
      schoolName: edu.schoolName,
      schoolDomain: edu.schoolDomain ?? null,
      degree: edu.degree ?? null,
      field: edu.field ?? null,
      startDate: edu.startDate ?? null,
      endDate: edu.endDate ?? null,
      description: edu.description ?? null,
      sortOrder: index,
    })),
  );
}

export async function createPersonWithRelations(input: {
  organizationId: string;
  payload: PersonPayload;
  rawTextFallback?: string | null;
}): Promise<PersonListItem> {
  const { organizationId } = input;
  const payload = normalizePayload(input.payload);
  const id = crypto.randomUUID();
  const rawText =
    payload.rawText ?? trimOrNull(input.rawTextFallback) ?? null;

  await db.insert(people).values({
    id,
    organizationId,
    name: payload.name,
    email: payload.email,
    headline: payload.headline,
    location: payload.location,
    imageUrl: payload.imageUrl,
    links: payload.links,
    notes: payload.notes,
    rawText,
    lastSeenAt: new Date(),
  });

  await replaceExperiences(id, payload.experiences);
  await replaceEducation(id, payload.education);

  const loaded = await loadPersonListItem(id, organizationId);
  if (!loaded) throw new Error("Failed to load created person");
  return loaded;
}

export async function updatePersonWithRelations(input: {
  personId: string;
  organizationId: string;
  payload: PersonPayload;
}): Promise<PersonListItem | null> {
  const { personId, organizationId } = input;
  const payload = normalizePayload(input.payload);

  const [existing] = await db
    .select({ id: people.id })
    .from(people)
    .where(
      and(eq(people.id, personId), eq(people.organizationId, organizationId)),
    )
    .limit(1);

  if (!existing) return null;

  await db
    .update(people)
    .set({
      name: payload.name,
      email: payload.email,
      headline: payload.headline,
      location: payload.location,
      imageUrl: payload.imageUrl,
      links: payload.links,
      notes: payload.notes,
      rawText: payload.rawText,
      lastSeenAt: new Date(),
    })
    .where(eq(people.id, personId));

  await replaceExperiences(personId, payload.experiences);
  await replaceEducation(personId, payload.education);

  return loadPersonListItem(personId, organizationId);
}

export async function deletePerson(input: {
  personId: string;
  organizationId: string;
}): Promise<boolean> {
  const { personId, organizationId } = input;

  const [existing] = await db
    .select({ id: people.id })
    .from(people)
    .where(
      and(eq(people.id, personId), eq(people.organizationId, organizationId)),
    )
    .limit(1);

  if (!existing) return false;

  await db.delete(people).where(eq(people.id, personId));
  return true;
}

export async function loadPersonForPrompt(
  personId: string,
  organizationId: string,
): Promise<PersonListItem | null> {
  return loadPersonListItem(personId, organizationId);
}

export function personListItemToPayload(
  person: PersonListItem,
): PersonPayload {
  return {
    name: person.name,
    email: person.email,
    headline: person.headline,
    location: person.location,
    imageUrl: person.imageUrl,
    links: person.links ?? {},
    notes: person.notes,
    rawText: person.rawText,
    experiences: person.experiences.map((e) => ({
      companyName: e.companyName,
      companyDomain: e.companyDomain,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      isCurrent: e.isCurrent,
      description: e.description,
    })),
    education: person.education.map((e) => ({
      schoolName: e.schoolName,
      schoolDomain: e.schoolDomain,
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
    })),
  };
}
