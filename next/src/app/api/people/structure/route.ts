import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import {
  createPersonWithRelations,
  peopleStructureSchema,
} from "@/lib/people/person-payload";

export const maxDuration = 60;

async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}

export async function POST(req: Request) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      { error: "AI Gateway not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as { text?: string } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.5"),
    schema: peopleStructureSchema,
    system: `You extract people profiles for a recruiting CRM called Roster.
Given messy pasted text (bios, LinkedIn dumps, links, notes), return one or more structured people.
Rules:
- Only include facts present or clearly implied in the text. Do not invent employers, schools, or contact info.
- Each person needs at least a name.
- Put social/profile URLs into links with keys like linkedin, twitter, github, personal, website, portfolio.
- Capture career history in experiences and schools in education when available.
- Store leftover unstructured text that is specific to that person in rawText and/or notes.
- If the dump clearly describes multiple people, return multiple entries.`,
    prompt: `Structure the following dump into people records:\n\n${text}`,
  });

  const people = [];
  for (const payload of object.people) {
    const person = await createPersonWithRelations({
      organizationId: ctx.orgId,
      payload: {
        ...payload,
        rawText: payload.rawText ?? text,
      },
      rawTextFallback: text,
    });
    people.push(person);
  }

  return NextResponse.json({ people, count: people.length });
}
