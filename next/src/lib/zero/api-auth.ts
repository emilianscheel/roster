import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getOrgIdForUser } from "@/lib/auth/org";

export async function requireZeroOrg() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const orgId = await getOrgIdForUser(session.user.id);
  if (!orgId) return null;
  return { session, orgId };
}
