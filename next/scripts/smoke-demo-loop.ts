import { eq, sql } from "drizzle-orm";
import { runDemoRecruitingLoop } from "../src/lib/agent/recruiting";
import { db } from "../src/lib/db";
import {
  approvalTasks,
  candidates,
  evidence,
  organizations,
  people,
  personExperiences,
  roles,
  user,
} from "../src/lib/db/schema";

const BRIEFS = [
  {
    theme: "founding_infra",
    brief:
      "Find a founding infrastructure engineer with production Rust and Kubernetes experience, active open-source work within 60 days, startup experience, and signs they may be open to a new role.",
  },
  {
    theme: "shortlist_three",
    brief:
      "Find three engineers who could become the founding infrastructure engineer at an agentic-AI startup: production Rust, Kubernetes, open-source activity within 60 days, startup experience, and a current transition signal.",
  },
  {
    theme: "sre_transition",
    brief:
      "Source platform engineers transitioning from SRE into infrastructure roles. Prefer Kubernetes operators and Rust networking experience. Qualify cheaply before deep enrichment.",
  },
] as const;

async function ensureUserAndOrg() {
  const userId = "smoke-demo-user";
  const orgId = "smoke-demo-org";

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!existingUser) {
    await db.insert(user).values({
      id: userId,
      name: "Smoke Demo",
      email: "smoke-demo@example.com",
      emailVerified: true,
    });
  }

  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!existingOrg) {
    await db.insert(organizations).values({
      id: orgId,
      name: "Smoke Demo Org",
    });
  }

  return { userId, orgId };
}

async function runOne(
  orgId: string,
  userId: string,
  theme: string,
  brief: string,
) {
  const roleId = crypto.randomUUID();
  await db.insert(roles).values({
    id: roleId,
    organizationId: orgId,
    createdById: userId,
    title: `Smoke ${theme}`,
    brief,
    status: "draft",
  });

  const steps = await runDemoRecruitingLoop(
    { organizationId: orgId, roleId, userId },
    brief,
  );

  const [candCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(candidates)
    .where(eq(candidates.roleId, roleId));
  const [evCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(evidence)
    .innerJoin(candidates, eq(evidence.candidateId, candidates.id))
    .where(eq(candidates.roleId, roleId));
  const [apprCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(approvalTasks)
    .where(eq(approvalTasks.roleId, roleId));
  const [expCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(personExperiences)
    .innerJoin(people, eq(personExperiences.personId, people.id))
    .innerJoin(candidates, eq(candidates.personId, people.id))
    .where(eq(candidates.roleId, roleId));
  const apprKinds = await db
    .select({ kind: approvalTasks.kind })
    .from(approvalTasks)
    .where(eq(approvalTasks.roleId, roleId));
  const [role] = await db
    .select({
      status: roles.status,
      claims: roles.claims,
    })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  const verified = await db
    .select({ id: candidates.id, evidenceConfidence: candidates.evidenceConfidence })
    .from(candidates)
    .where(eq(candidates.roleId, roleId));

  const withEvidence = verified.filter((c) => (c.evidenceConfidence ?? 0) > 0).length;

  return {
    theme,
    steps: steps.length,
    candidates: candCount?.n ?? 0,
    evidence: evCount?.n ?? 0,
    approvals: apprCount?.n ?? 0,
    experiences: expCount?.n ?? 0,
    approvalKinds: [...new Set(apprKinds.map((a) => a.kind))],
    roleStatus: role?.status,
    claimLabels: ((role?.claims as { label: string }[]) || []).map((c) => c.label),
    withEvidence,
  };
}

async function main() {
  const { userId, orgId } = await ensureUserAndOrg();
  const only = process.env.SMOKE_THEME;
  const briefs = only
    ? BRIEFS.filter((b) => b.theme === only)
    : BRIEFS;
  if (!briefs.length) {
    throw new Error(`Unknown SMOKE_THEME=${only}`);
  }
  const results = [];
  for (const b of briefs) {
    results.push(await runOne(orgId, userId, b.theme, b.brief));
  }
  console.log(JSON.stringify(results, null, 2));

  for (const r of results) {
    if (r.candidates < 5) throw new Error(`${r.theme}: expected >=5 candidates`);
    if (r.evidence < 5) throw new Error(`${r.theme}: expected evidence rows`);
    if (r.approvals < 2) throw new Error(`${r.theme}: expected multiple approvals`);
    if (r.experiences < 3) throw new Error(`${r.theme}: expected career history`);
    if (r.withEvidence < 3) throw new Error(`${r.theme}: expected evidenceConfidence > 0`);
    if (r.roleStatus !== "review") throw new Error(`${r.theme}: role not review`);
  }

  const founding = results.find((r) => r.theme === "founding_infra");
  const sre = results.find((r) => r.theme === "sre_transition");
  if (founding && !founding.claimLabels.some((l) => l.includes("Rust"))) {
    throw new Error("founding theme missing Rust claim");
  }
  if (sre && !sre.claimLabels.some((l) => l.toLowerCase().includes("sre"))) {
    throw new Error("sre theme missing SRE claim");
  }

  console.log("DEMO LOOP SMOKE OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
