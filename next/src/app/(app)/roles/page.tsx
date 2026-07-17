import Link from "next/link";
import { Suspense } from "react";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { candidates, roleRequirements, roles } from "@/lib/db/schema";
import { RolesGrid } from "@/components/roles/roles-grid";
import type { RoleListItem } from "@/components/roles/types";
import { Button } from "@/components/ui/button";

export default async function RolesPage() {
  const { orgId } = await requireSession();
  const list = await db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, orgId))
    .orderBy(desc(roles.createdAt));

  const roleIds = list.map((r) => r.id);

  const [candidateCounts, requirementCounts] =
    roleIds.length === 0
      ? [[], []]
      : await Promise.all([
          db
            .select({
              roleId: candidates.roleId,
              count: sql<number>`count(*)::int`,
            })
            .from(candidates)
            .where(inArray(candidates.roleId, roleIds))
            .groupBy(candidates.roleId),
          db
            .select({
              roleId: roleRequirements.roleId,
              count: sql<number>`count(*)::int`,
            })
            .from(roleRequirements)
            .where(inArray(roleRequirements.roleId, roleIds))
            .groupBy(roleRequirements.roleId),
        ]);

  const candidatesByRole = new Map(
    candidateCounts.map((row) => [row.roleId, row.count]),
  );
  const requirementsByRole = new Map(
    requirementCounts.map((row) => [row.roleId, row.count]),
  );

  const rolesData: RoleListItem[] = list.map((role) => ({
    id: role.id,
    title: role.title,
    status: role.status,
    seniority: role.seniority,
    location: role.location,
    spentCents: role.spentCents,
    budgetCents: role.budgetCents,
    candidateCount: candidatesByRole.get(role.id) ?? 0,
    requirementCount: requirementsByRole.get(role.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">Roles</h1>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/new" />}
          className="gap-1"
        >
          <Plus data-icon="inline-start" />
          New
        </Button>
      </div>
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading…</div>
        }
      >
        <RolesGrid roles={rolesData} />
      </Suspense>
    </div>
  );
}
