import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ensureOrgForUser, getOrgIdForUser } from "@/lib/auth/org";
import { db } from "@/lib/db";
import { people, zeroCalls } from "@/lib/db/schema";
import { applyPersonEnrichment } from "@/lib/people/apply-enrichment";
import {
  enrichServiceForTool,
  isPersonEnrichToolId,
  mockPersonEnrich,
} from "@/lib/zero/mock-person-enrich";

async function orgFromSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  let orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) orgId = await ensureOrgForUser(session.user.id, session.user.name);
  return { session, orgId };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const authCtx = await orgFromSession();
  if (!authCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: personId } = await ctx.params;
  const body = (await req.json()) as { toolId?: string };
  const toolId = body.toolId?.trim();
  if (!toolId || !isPersonEnrichToolId(toolId)) {
    return NextResponse.json({ error: "Invalid toolId" }, { status: 400 });
  }

  const [person] = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.id, personId),
        eq(people.organizationId, authCtx.orgId),
      ),
    )
    .limit(1);

  if (!person) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const started = Date.now();
  // Simulated provider latency so the UI can show a running state.
  await sleep(700 + Math.floor(Math.random() * 900));

  const mock = mockPersonEnrich(toolId, {
    name: person.name,
    email: person.email,
    headline: person.headline,
    location: person.location,
  });

  const updated = await applyPersonEnrichment({
    personId,
    organizationId: authCtx.orgId,
    toolId,
    result: mock,
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const latencyMs = Date.now() - started;
  const callId = crypto.randomUUID();
  await db.insert(zeroCalls).values({
    id: callId,
    organizationId: authCtx.orgId,
    roleId: null,
    candidateId: null,
    service: enrichServiceForTool(toolId),
    capability: "person.enrich",
    purpose: `Enrich person profile for ${person.name}`,
    quotedCents: toolId === "clado-contacts-enrich" ? 20 : toolId === "apollo-people-enrichment" ? 5 : 2,
    actualCents: toolId === "clado-contacts-enrich" ? 20 : toolId === "apollo-people-enrichment" ? 5 : 2,
    latencyMs,
    status: "success",
    evidenceGained: mock.claims.length,
    resultSummary: `Demo enrich via ${toolId}`,
    demo: true,
  });

  return NextResponse.json({
    person: updated,
    callId,
    claims: mock.claims,
  });
}
