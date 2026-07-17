import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  agentSessions,
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
    [sessionCount],
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
      .from(agentSessions)
      .where(eq(agentSessions.organizationId, orgId)),
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

  return {
    home: String(pendingCount),
    sessions: String(sessionCount?.count ?? 0),
    roles: String(roleCount?.count ?? 0),
    people: String(peopleCount?.count ?? 0),
    approvals: String(pendingCount),
    arena: String(arenaCount?.count ?? 0),
    spend: formatSpendDollars(Number(spend?.total || 0)),
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

  const cands = await db
    .select({
      id: candidates.id,
      stage: candidates.stage,
      outreachDraft: candidates.outreachDraft,
    })
    .from(candidates)
    .where(eq(candidates.roleId, roleId));

  const candIds = cands.map((c) => c.id);

  const [[reqCount], [callCount], evidenceRows] = await Promise.all([
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
  ]);

  const outreachCount = cands.filter((c) => c.outreachDraft).length;
  const outcomesCount = cands.filter((c) =>
    ["contacted", "replied", "interview", "rejected"].includes(c.stage),
  ).length;
  const calls = callCount?.count ?? 0;

  return {
    brief: String(reqCount?.count ?? 0),
    live: String(calls),
    pipeline: String(cands.length),
    evidence: String(evidenceRows[0]?.count ?? 0),
    outreach: String(outreachCount),
    outcomes: String(outcomesCount),
    "role-arena": String(calls),
    "role-spend": formatCents(role.spentCents),
  };
}
