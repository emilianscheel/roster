import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ensureOrgForUser, getOrgIdForUser } from "@/lib/auth/org";

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    redirect("/sign-in");
  }
  let orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) {
    orgId = await ensureOrgForUser(session.user.id, session.user.name);
  }
  return { session, orgId };
}

export async function getOptionalSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
