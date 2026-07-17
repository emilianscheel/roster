import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";
import {
  createPersonWithRelations,
  personPayloadSchema,
} from "@/lib/people/person-payload";

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

  const body = await req.json().catch(() => null);
  const parsed = personPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid person payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const person = await createPersonWithRelations({
    organizationId: ctx.orgId,
    payload: parsed.data,
  });

  return NextResponse.json({ person });
}
