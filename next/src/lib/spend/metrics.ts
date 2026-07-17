/**
 * Spend metrics helpers.
 *
 * Scale note: `zero_calls.actualCents` / `quotedCents` store dollar amounts
 * (e.g. 0.8 = $0.80). Role/candidate `*Cents` fields are true integer cents.
 * All public helpers return dollars unless named `*Cents`.
 */

export type PipelineStage =
  | "discovered"
  | "researching"
  | "verified"
  | "approved"
  | "contacted"
  | "replied"
  | "interview"
  | "rejected";

export type ZeroCallStatus = "success" | "failed" | "skipped" | "blocked";

export type LedgerCall = {
  id: string;
  roleId: string | null;
  candidateId: string | null;
  service: string;
  capability: string;
  purpose: string;
  quotedCents: number;
  actualCents: number;
  status: ZeroCallStatus;
  evidenceGained: number;
  createdAt: Date | string;
};

export type RoleBudgetRow = {
  id: string;
  title: string;
  status: string;
  budgetCents: number;
  spentCents: number;
  maxPerCandidateCents: number;
  maxToolCallCents: number;
};

export type CandidateSpendRow = {
  id: string;
  name: string;
  stage: PipelineStage;
  verificationSpendCents: number;
  evidenceCount?: number;
};

/** Ledger dollar amount → dollars. */
export function ledgerToDollars(amount: number): number {
  return Number(amount) || 0;
}

/** Integer cents → dollars. */
export function centsToDollars(cents: number): number {
  return (Number(cents) || 0) / 100;
}

export function formatDollars(
  dollars: number,
  digits: number = 2,
): string {
  return `$${dollars.toFixed(digits)}`;
}

export function formatCentsAsDollars(cents: number, digits: number = 2): string {
  return formatDollars(centsToDollars(cents), digits);
}

export function utilizationPct(spentCents: number, budgetCents: number): number {
  if (!budgetCents || budgetCents <= 0) return 0;
  return Math.min(999, Math.round((spentCents / budgetCents) * 100));
}

const VERIFIED_PLUS: ReadonlySet<PipelineStage> = new Set([
  "verified",
  "approved",
  "contacted",
  "replied",
  "interview",
]);

const APPROVED_PLUS: ReadonlySet<PipelineStage> = new Set([
  "approved",
  "contacted",
  "replied",
  "interview",
]);

const CONTACTED_PLUS: ReadonlySet<PipelineStage> = new Set([
  "contacted",
  "replied",
  "interview",
]);

export function countAtOrBeyond(
  stages: Iterable<PipelineStage>,
  gate: "verified" | "approved" | "contacted" | "interview",
): number {
  let n = 0;
  for (const stage of stages) {
    if (gate === "verified" && VERIFIED_PLUS.has(stage)) n += 1;
    else if (gate === "approved" && APPROVED_PLUS.has(stage)) n += 1;
    else if (gate === "contacted" && CONTACTED_PLUS.has(stage)) n += 1;
    else if (gate === "interview" && stage === "interview") n += 1;
  }
  return n;
}

export function costPer(
  totalDollars: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  return totalDollars / count;
}

export function formatCostPer(totalDollars: number, count: number): string {
  const v = costPer(totalDollars, count);
  return v === null ? "—" : formatDollars(v);
}

export type CallLedgerStats = {
  totalSpend: number;
  callCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  blockedCount: number;
  savedBySkip: number;
  failedWaste: number;
  byService: { service: string; spend: number; count: number }[];
};

export function summarizeCalls(calls: LedgerCall[]): CallLedgerStats {
  let totalSpend = 0;
  let failedWaste = 0;
  let savedBySkip = 0;
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let blockedCount = 0;
  const serviceMap = new Map<string, { spend: number; count: number }>();

  for (const c of calls) {
    const actual = ledgerToDollars(c.actualCents);
    const quoted = ledgerToDollars(c.quotedCents);
    totalSpend += actual;

    if (c.status === "success") successCount += 1;
    else if (c.status === "failed") {
      failedCount += 1;
      failedWaste += actual;
    } else if (c.status === "skipped") {
      skippedCount += 1;
      savedBySkip += quoted;
    } else if (c.status === "blocked") blockedCount += 1;

    const prev = serviceMap.get(c.service) ?? { spend: 0, count: 0 };
    prev.spend += actual;
    prev.count += 1;
    serviceMap.set(c.service, prev);
  }

  const byService = [...serviceMap.entries()]
    .map(([service, v]) => ({ service, spend: v.spend, count: v.count }))
    .sort((a, b) => b.spend - a.spend);

  return {
    totalSpend,
    callCount: calls.length,
    successCount,
    failedCount,
    skippedCount,
    blockedCount,
    savedBySkip,
    failedWaste,
    byService,
  };
}

export type FunnelCosts = {
  verifiedCount: number;
  approvedCount: number;
  contactedCount: number;
  interviewCount: number;
  costPerVerified: number | null;
  costPerApproved: number | null;
  costPerContacted: number | null;
  costPerInterview: number | null;
};

export function funnelCosts(
  totalSpendDollars: number,
  stages: PipelineStage[],
): FunnelCosts {
  const verifiedCount = countAtOrBeyond(stages, "verified");
  const approvedCount = countAtOrBeyond(stages, "approved");
  const contactedCount = countAtOrBeyond(stages, "contacted");
  const interviewCount = countAtOrBeyond(stages, "interview");
  return {
    verifiedCount,
    approvedCount,
    contactedCount,
    interviewCount,
    costPerVerified: costPer(totalSpendDollars, verifiedCount),
    costPerApproved: costPer(totalSpendDollars, approvedCount),
    costPerContacted: costPer(totalSpendDollars, contactedCount),
    costPerInterview: costPer(totalSpendDollars, interviewCount),
  };
}

export type RoleSpendSummary = {
  roleId: string;
  title: string;
  status: string;
  spentCents: number;
  budgetCents: number;
  remainingCents: number;
  utilization: number;
  totalSpendDollars: number;
  savedBySkip: number;
  failedWaste: number;
  verifiedCount: number;
  costPerVerified: number | null;
};

export function buildRoleSpendSummaries(
  roleRows: RoleBudgetRow[],
  calls: LedgerCall[],
  candidatesByRole: Map<string, PipelineStage[]>,
): RoleSpendSummary[] {
  const callsByRole = new Map<string, LedgerCall[]>();
  for (const c of calls) {
    if (!c.roleId) continue;
    const list = callsByRole.get(c.roleId) ?? [];
    list.push(c);
    callsByRole.set(c.roleId, list);
  }

  return roleRows
    .map((role) => {
      const roleCalls = callsByRole.get(role.id) ?? [];
      const stats = summarizeCalls(roleCalls);
      // Prefer role.spentCents rollup when present; fall back to ledger sum.
      const spentFromRollup = centsToDollars(role.spentCents);
      const totalSpendDollars =
        role.spentCents > 0 ? spentFromRollup : stats.totalSpend;
      const stages = candidatesByRole.get(role.id) ?? [];
      const verifiedCount = countAtOrBeyond(stages, "verified");
      return {
        roleId: role.id,
        title: role.title,
        status: role.status,
        spentCents: role.spentCents,
        budgetCents: role.budgetCents,
        remainingCents: Math.max(0, role.budgetCents - role.spentCents),
        utilization: utilizationPct(role.spentCents, role.budgetCents),
        totalSpendDollars,
        savedBySkip: stats.savedBySkip,
        failedWaste: stats.failedWaste,
        verifiedCount,
        costPerVerified: costPer(totalSpendDollars, verifiedCount),
      };
    })
    .sort((a, b) => b.spentCents - a.spentCents);
}

export function efficiencyRanking(
  summaries: RoleSpendSummary[],
): { best: RoleSpendSummary[]; worst: RoleSpendSummary[] } {
  const ranked = summaries
    .filter((s) => s.verifiedCount >= 1 && s.costPerVerified !== null)
    .sort(
      (a, b) => (a.costPerVerified ?? 0) - (b.costPerVerified ?? 0),
    );
  return {
    best: ranked.slice(0, 3),
    worst: [...ranked].reverse().slice(0, 3),
  };
}

export type CandidateSpendSummary = {
  id: string;
  name: string;
  stage: PipelineStage;
  spendCents: number;
  spendDollars: number;
  evidenceCount: number;
};

export function buildCandidateSpendSummaries(
  candidates: CandidateSpendRow[],
): CandidateSpendSummary[] {
  return candidates
    .map((c) => ({
      id: c.id,
      name: c.name,
      stage: c.stage,
      spendCents: c.verificationSpendCents,
      spendDollars: centsToDollars(c.verificationSpendCents),
      evidenceCount: c.evidenceCount ?? 0,
    }))
    .sort((a, b) => b.spendCents - a.spendCents);
}

export function avgSpendPerCandidate(
  candidates: CandidateSpendRow[],
): number {
  if (candidates.length === 0) return 0;
  const total = candidates.reduce(
    (sum, c) => sum + centsToDollars(c.verificationSpendCents),
    0,
  );
  return total / candidates.length;
}
