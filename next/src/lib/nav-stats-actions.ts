"use server";

import { requireSession } from "@/lib/auth/session";
import { getRoleNavStats, type NavStats } from "@/lib/nav-stats";

export async function loadRoleNavStats(roleId: string): Promise<NavStats> {
  const { orgId } = await requireSession();
  const stats = await getRoleNavStats(orgId, roleId);
  return stats ?? {};
}
