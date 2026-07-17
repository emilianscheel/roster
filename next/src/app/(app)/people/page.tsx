import { Suspense } from "react";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  people,
  personEducation,
  personExperiences,
} from "@/lib/db/schema";
import { PeopleGrid } from "@/components/people/people-grid";
import type { PersonListItem } from "@/components/people/types";

export default async function PeoplePage() {
  const { orgId } = await requireSession();
  const list = await db
    .select()
    .from(people)
    .where(eq(people.organizationId, orgId))
    .orderBy(desc(people.lastSeenAt));

  const ids = list.map((p) => p.id);

  const [experiences, education] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select()
            .from(personExperiences)
            .where(inArray(personExperiences.personId, ids))
            .orderBy(asc(personExperiences.sortOrder)),
          db
            .select()
            .from(personEducation)
            .where(inArray(personEducation.personId, ids))
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

  const peopleData: PersonListItem[] = list.map((p) => ({
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
    createdAt: p.createdAt.toISOString(),
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
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">People</h1>
        <p className="text-sm text-muted-foreground">
          Org roster with structured profiles and career history
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <PeopleGrid people={peopleData} />
      </Suspense>
    </div>
  );
}
