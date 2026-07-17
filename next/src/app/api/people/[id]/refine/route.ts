import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import {
  loadPersonForPrompt,
  personListItemToPayload,
  personPayloadSchema,
} from "@/lib/people/person-payload";

export const maxDuration = 60;

async function requireOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const ctx = await requireOrg();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      { error: "AI Gateway not configured" },
      { status: 503 },
    );
  }

  const { id } = await params;
  const existing = await loadPersonForPrompt(id, ctx.orgId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const current = personListItemToPayload(existing);

  const { object: refined } = await generateObject({
    model: gateway("anthropic/claude-sonnet-4.5"),
    schema: personPayloadSchema,
    system: `You refine a person profile for a recruiting CRM called Roster.
Improve clarity and fill gaps using only information already present in the profile (including rawText and notes).
Do not invent employers, schools, emails, or links.
Keep the same person identity. Return a complete structured person object.`,
    prompt: `Refine this person profile into a cleaner structured record.

Current JSON:
${JSON.stringify(current, null, 2)}`,
  });

  if (!refined.name.trim()) {
    return NextResponse.json(
      { error: "Failed to refine person" },
      { status: 502 },
    );
  }

  return NextResponse.json({ person: refined });
}
