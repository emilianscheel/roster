import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  approvalTasks,
  candidates,
  evidence,
  knowledgeSnippets,
  people,
  roleRequirements,
  roles,
  zeroCalls,
} from "@/lib/db/schema";
import type { NavItemId } from "@/lib/nav";
import { getZeroConnection } from "@/lib/zero/connection";
import { getZeroToolCount } from "@/lib/zero-tools";

export type NavStats = Partial<Record<NavItemId, string>>;

function formatSpendDollars(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatCents(cents: number): string {
  return formatSpendDollars(cents / 100);
}

export async function getGlobalNavStats(orgId: string): Promise<NavStats> {
  const [
    [pending],
    [roleCount],
    [peopleCount],
    [arenaCount],
    [spend],
    [knowledgeCount],
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(approvalTasks)
      .where(
        and(
          eq(approvalTasks.organizationId, orgId),
          eq(approvalTasks.status, "pending"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(roles)
      .where(eq(roles.organizationId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(people)
      .where(eq(people.organizationId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(zeroCalls)
      .where(eq(zeroCalls.organizationId, orgId)),
    db
      .select({
        total: sql<number>`coalesce(sum(${zeroCalls.actualCents}), 0)`,
      })
      .from(zeroCalls)
      .where(eq(zeroCalls.organizationId, orgId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeSnippets)
      .where(eq(knowledgeSnippets.organizationId, orgId)),
  ]);

  const pendingCount = pending?.count ?? 0;
  const spendTotal = Number(spend?.total || 0);
  const spendLabel = formatSpendDollars(spendTotal);

  // Surface budget pressure when any role is ≥80% utilized.
  const orgRoles = await db
    .select({
      budgetCents: roles.budgetCents,
      spentCents: roles.spentCents,
    })
    .from(roles)
    .where(eq(roles.organizationId, orgId));
  let maxUtil = 0;
  for (const r of orgRoles) {
    if (r.budgetCents <= 0) continue;
    maxUtil = Math.max(maxUtil, Math.round((r.spentCents / r.budgetCents) * 100));
  }

  const zeroConn = await getZeroConnection(orgId);
  const onboardingBadge = !zeroConn
    ? "Set up"
    : zeroConn.liveEnabled
      ? "Live"
      : "Fund";

  return {
    home: String(pendingCount),
    onboarding: onboardingBadge,
    roles: String(roleCount?.count ?? 0),
    people: String(peopleCount?.count ?? 0),
    approvals: String(pendingCount),
    tools: String(getZeroToolCount()),
    arena: String(arenaCount?.count ?? 0),
    spend: maxUtil >= 80 ? `${spendLabel} · ${maxUtil}%` : spendLabel,
    knowledge: String(knowledgeCount?.count ?? 0),
  };
}

export async function getRoleNavStats(
  orgId: string,
  roleId: string,
): Promise<NavStats | null> {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, orgId)))
    .limit(1);

  if (!role) return null;

  const now = new Date();
  const cands = await db
    .select({
      id: candidates.id,
      stage: candidates.stage,
    })
    .from(candidates)
    .where(eq(candidates.roleId, roleId));

  const candIds = cands.map((c) => c.id);

  const [[reqCount], [callCount], evidenceRows, [outreachPending]] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(roleRequirements)
        .where(eq(roleRequirements.roleId, roleId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(zeroCalls)
        .where(
          and(eq(zeroCalls.organizationId, orgId), eq(zeroCalls.roleId, roleId)),
        ),
      candIds.length === 0
        ? Promise.resolve([{ count: 0 }])
        : db
            .select({ count: sql<number>`count(*)::int` })
            .from(evidence)
            .where(inArray(evidence.candidateId, candIds)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(approvalTasks)
        .where(
          and(
            eq(approvalTasks.organizationId, orgId),
            eq(approvalTasks.roleId, roleId),
            eq(approvalTasks.kind, "send_outreach"),
            eq(approvalTasks.status, "pending"),
            or(isNull(approvalTasks.remindAt), lte(approvalTasks.remindAt, now)),
          ),
        ),
    ]);

  const outcomesCount = cands.filter((c) =>
    ["contacted", "replied", "interview", "rejected"].includes(c.stage),
  ).length;
  const calls = callCount?.count ?? 0;

  return {
    brief: String(reqCount?.count ?? 0),
    live: String(calls),
    pipeline: String(cands.length),
    evidence: String(evidenceRows[0]?.count ?? 0),
    outreach: String(outreachPending?.count ?? 0),
    outcomes: String(outcomesCount),
    "role-arena": String(calls),
    "role-spend": formatCents(role.spentCents),
  };
}
